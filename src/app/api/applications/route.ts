import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { checkTierAccess } from '@/lib/payments/tier-gate';
import { applyRateLimit } from '@/lib/rate-limit/middleware';
import { createApplicationSchema, updateApplicationSchema, validateInput } from '@/lib/validation/schemas';
import { SubscriptionTier } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } }, { status: 401 });

    const { data, error } = await supabase
      .from('applications')
      .select('*, job:job_postings(id, company_name, title, location, source_url, remote_type)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: { code: 'QUERY_FAILED', message: 'Could not load applications.' } }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('subscription_tier').eq('id', user.id).single();
    let usage = null;
    try {
      const { data: usageData } = await supabase.rpc('get_weekly_usage', { p_user_id: user.id });
      usage = usageData;
    } catch {}

    const tier = (profile?.subscription_tier || 'free') as SubscriptionTier;

    if (usage) {
      const gate = checkTierAccess(tier, 'apply', usage);
      if (!gate.allowed) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'TIER_LIMIT_REACHED',
            message: gate.reason || 'Weekly application limit reached.',
            action: gate.upgrade_message,
          },
          meta: gate.usage ? { current: gate.usage.current, limit: gate.usage.limit } : undefined,
        }, { status: 403 });
      }
    }

    const body = await req.json();
    const validation = validateInput(createApplicationSchema, body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: validation.error } }, { status: 400 });
    }
    const { job_id, target_profile_id, match_score, status = 'applied' } = validation.data;

    const blocked = await applyRateLimit(user.id, tier, 'apply');
    if (blocked) return blocked;

    const { data: existing } = await supabase
      .from('applications')
      .select('id')
      .eq('user_id', user.id)
      .eq('job_id', job_id)
      .single();

    if (existing) {
      return NextResponse.json({ success: false, error: { code: 'DUPLICATE_APPLICATION', message: 'You have already applied to this job.' } }, { status: 409 });
    }

    const { data: application, error } = await supabase
      .from('applications')
      .insert({
        user_id: user.id,
        job_id,
        target_profile_id,
        match_score: match_score || 0,
        status,
        applied_at: status === 'applied' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: { code: 'INSERT_FAILED', message: 'Could not create application. Please try again.' } }, { status: 500 });
    }

    try {
      await supabase.rpc('increment_usage', { p_user_id: user.id, p_field: 'applications_count' });
    } catch {}

    // Create follow-up reminders + outreach suggestions if applied
    if (status === 'applied') {
      try {
        const followUps = [3, 7, 14, 21].map(days => ({
          application_id: application.id,
          user_id: user.id,
          due_date: new Date(Date.now() + days * 86400000).toISOString().split('T')[0],
          type: days <= 3 ? 'networking' : 'recruiter',
          day_number: days,
        }));
        await supabase.from('follow_ups').insert(followUps);
      } catch {}

      // Auto-generate outreach suggestions
      try {
        const origin = req.nextUrl.origin;
        await fetch(`${origin}/api/network/suggest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Cookie': req.headers.get('cookie') || '' },
          body: JSON.stringify({ application_id: application.id, job_id: job_id }),
        });
      } catch {}
    }

    return NextResponse.json({ success: true, data: application }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } }, { status: 401 });

    const body = await req.json();
    const validation = validateInput(updateApplicationSchema, body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: validation.error } }, { status: 400 });
    }
    const { id, status, notes, rejection_reason } = validation.data;

    const updateData: Record<string, any> = {};
    if (status) {
      const validStatuses = ['saved', 'resume_ready', 'applied', 'hr_screen', 'technical', 'behavioral', 'final', 'offer', 'rejected', 'no_response'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid status.' } }, { status: 400 });
      }
      updateData.status = status;
      if (status === 'applied') updateData.applied_at = new Date().toISOString();
    }
    if (notes !== undefined) updateData.notes = notes;
    if (rejection_reason !== undefined) updateData.rejection_reason = rejection_reason;

    const { data: application, error } = await supabase
      .from('applications')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: { code: 'UPDATE_FAILED', message: 'Could not update application.' } }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: application });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } }, { status: 500 });
  }
}