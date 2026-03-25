import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { checkTierAccess } from '@/lib/payments/tier-gate';
import { craftMessage } from '@/lib/ai/message-crafter';
import { applyRateLimit } from '@/lib/rate-limit/middleware';
import { SubscriptionTier, MessageTone } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } }, { status: 401 });

    const type = req.nextUrl.searchParams.get('type') || 'contacts';

    if (type === 'follow-ups') {
      const { data } = await supabase.from('follow_ups').select('*, applications(job_postings(company_name, title))')
        .eq('user_id', user.id).eq('is_completed', false).order('due_date', { ascending: true });
      return NextResponse.json({ success: true, data: data || [] });
    }

    const { data } = await supabase.from('contacts').select('*, messages(*)')
      .eq('user_id', user.id).order('created_at', { ascending: false });
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

    const body = await req.json();
    const action = body.action || 'add_contact';

    if (action === 'generate_message') {
      const { data: profile } = await supabase.from('users').select('subscription_tier, full_name').eq('id', user.id).single();
      const tier = (profile?.subscription_tier || 'free') as SubscriptionTier;

      // Rate limit: ai_message
      const blocked = await applyRateLimit(user.id, tier, 'ai_message');
      if (blocked) return blocked;

      // Tier gate — graceful
      try {
        const { data: usage } = await supabase.rpc('get_weekly_usage', { p_user_id: user.id });
        const gate = checkTierAccess(tier, 'generate_message', usage);
        if (!gate.allowed) {
          return NextResponse.json({ success: false, error: { code: 'TIER_LIMIT_REACHED', message: gate.reason!, action: gate.upgrade_message } }, { status: 403 });
        }
      } catch {}

      const { contact_id, tone, company, role } = body;
      const { data: contact } = await supabase.from('contacts').select('*').eq('id', contact_id).single();
      if (!contact) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Contact not found.' } }, { status: 404 });

      const content = await craftMessage(
        tone as MessageTone, contact.name, contact.title || '', company, role, profile?.full_name || ''
      );

      const { data: message } = await supabase.from('messages').insert({
        contact_id, user_id: user.id, tone, content,
      }).select().single();

      await supabase.rpc('increment_usage', { p_user_id: user.id, p_field: 'messages_generated' });
      return NextResponse.json({ success: true, data: { content, message } }, { status: 201 });
    }

    // Default: add contact
    const { application_id, name, title, linkedin_url, email } = body;
    const { data: contact, error } = await supabase.from('contacts').insert({
      application_id, user_id: user.id, name, title, linkedin_url, email,
    }).select().single();

    if (error) return NextResponse.json({ success: false, error: { code: 'INSERT_FAILED', message: 'Could not add contact.' } }, { status: 500 });
    return NextResponse.json({ success: true, data: contact }, { status: 201 });
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
    const { follow_up_id, is_completed } = body;

    if (follow_up_id) {
      const { data } = await supabase.from('follow_ups').update({
        is_completed: true, completed_at: new Date().toISOString(),
      }).eq('id', follow_up_id).eq('user_id', user.id).select().single();
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing follow_up_id.' } }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } }, { status: 500 });
  }
}
