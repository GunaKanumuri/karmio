import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { checkTierAccess } from '@/lib/payments/tier-gate';
import { generateInterviewPrep, PrepType } from '@/lib/ai/interview-prep';
import { SubscriptionTier } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('subscription_tier, visa_status').eq('id', user.id).single();
    const tier = (profile?.subscription_tier || 'free') as SubscriptionTier;
    const gate = checkTierAccess(tier, 'interview_prep');

    if (!gate.allowed) {
      return NextResponse.json({ success: false, error: { code: 'TIER_LIMIT_REACHED', message: gate.reason!, action: gate.upgrade_message } }, { status: 403 });
    }

    const body = await req.json();
    const { prep_type, job_id } = body;

    if (!prep_type || !job_id) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'prep_type and job_id are required.' } }, { status: 400 });
    }

    const { data: job } = await supabase.from('job_postings').select('*').eq('id', job_id).single();
    if (!job) return NextResponse.json({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found.' } }, { status: 404 });

    const { data: experiences } = await supabase.from('experiences').select('*').eq('user_id', user.id);
    const totalYears = (experiences || []).reduce((sum, e) => {
      const start = new Date(e.start_date).getTime();
      const end = e.end_date ? new Date(e.end_date).getTime() : Date.now();
      return sum + (end - start) / (365.25 * 24 * 60 * 60 * 1000);
    }, 0);

    const parsedJD = job.description_parsed || { required_skills: [], responsibilities: [], education_requirements: [], experience_years: { min: 0, max: null }, keywords: [], preferred_skills: [] };

    const result = await generateInterviewPrep(
      prep_type as PrepType, job.title, job.company_name, parsedJD, Math.round(totalYears), profile?.visa_status
    );

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error('Interview prep error:', err);
    return NextResponse.json({ success: false, error: { code: 'AI_GENERATION_FAILED', message: 'Prep generation failed. Please try again.', retryable: true } }, { status: 500 });
  }
}
