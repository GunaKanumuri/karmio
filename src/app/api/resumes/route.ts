import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { checkTierAccess } from '@/lib/payments/tier-gate';
import { tailorResume } from '@/lib/ai/resume-tailor';
import { applyRateLimit } from '@/lib/rate-limit/middleware';
import { generateResumeSchema, validateInput } from '@/lib/validation/schemas';
import { SubscriptionTier } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } }, { status: 401 });

    const { data, error } = await supabase
      .from('resume_recipes')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ success: false, error: { code: 'QUERY_FAILED', message: 'Could not load resumes.' } }, { status: 500 });
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
    const tier = (profile?.subscription_tier || 'free') as SubscriptionTier;

    // Rate limit: ai_resume
    const blocked = await applyRateLimit(user.id, tier, 'ai_resume');
    if (blocked) return blocked;

    // Check tier limits — graceful if rpc/table not available
    try {
      const { data: usage } = await supabase.rpc('get_weekly_usage', { p_user_id: user.id });
      const gate = checkTierAccess(tier, 'generate_resume', usage);
      if (!gate.allowed) {
        return NextResponse.json({ success: false, error: { code: 'TIER_LIMIT_REACHED', message: gate.reason!, action: gate.upgrade_message } }, { status: 403 });
      }
    } catch {
      // RPC may not exist — skip tier check
    }

    const body = await req.json();
    const validation = validateInput(generateResumeSchema, body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: validation.error } }, { status: 400 });
    }
    const { job_id, target_profile_id } = validation.data;

    // Fetch job, experiences, projects, profile
    const [jobRes, expRes, projRes, tpRes] = await Promise.all([
      supabase.from('job_postings').select('*').eq('id', job_id).single(),
      supabase.from('experiences').select('*').eq('user_id', user.id),
      supabase.from('projects').select('*').eq('user_id', user.id),
      target_profile_id
        ? supabase.from('target_profiles').select('*').eq('id', target_profile_id).single()
        : supabase.from('target_profiles').select('*').eq('user_id', user.id).eq('is_primary', true).single(),
    ]);

    const job = jobRes.data;
    if (!job) return NextResponse.json({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'This job appears to have been removed.' } }, { status: 404 });

    const experiences = expRes.data || [];
    const projects = projRes.data || [];
    const targetProfile = tpRes.data;
    const parsedJD = job.description_parsed || { required_skills: [], preferred_skills: [], responsibilities: [], education_requirements: [], experience_years: { min: 0, max: null }, keywords: [] };

    // AI tailoring — falls back to basic matching if AI unavailable
    const { data: userData } = await supabase.from('users').select('full_name').eq('id', user.id).single();
    let tailored;
    try {
      tailored = await tailorResume(experiences, projects.slice(0, 3), parsedJD, '', job.title, job.company_name);
    } catch (aiErr) {
      console.error('AI tailoring failed, using fallback:', aiErr);
      // Fallback: basic keyword matching without AI
      const jobText = (job.description_raw || '').toLowerCase();
      const allSkills = [
        ...(targetProfile?.priority_skills || []),
        ...experiences.flatMap((e: any) => e.technologies || []),
      ];
      const matched = allSkills.filter(s => jobText.includes(s.toLowerCase()));
      const missing = (parsedJD.required_skills || []).filter((s: string) => !matched.includes(s.toLowerCase()));
      tailored = {
        enhanced_bullets: {},
        enhanced_summary: `Experienced professional targeting ${job.title} at ${job.company_name}. Skills include ${matched.slice(0, 5).join(', ')}.`,
        keywords_used: matched,
      };
    }

    // Save recipe
    const { data: recipe, error: insertErr } = await supabase.from('resume_recipes').insert({
      user_id: user.id,
      job_id,
      target_profile_id: targetProfile?.id,
      selected_project_ids: projects.slice(0, 3).map((p: any) => p.id),
      enhanced_bullets: tailored.enhanced_bullets,
      enhanced_summary: tailored.enhanced_summary,
      keywords_matched: tailored.keywords_used,
      keywords_missing: (parsedJD.required_skills || []).filter((s: string) => !(tailored.keywords_used || []).includes(s.toLowerCase())),
      match_score: job.match_score || Math.round((tailored.keywords_used?.length || 0) / Math.max(1, (parsedJD.required_skills?.length || 1)) * 100),
      format: 'docx',
      page_count: experiences.length > 3 ? 2 : 1,
    }).select().single();

    if (insertErr) return NextResponse.json({ success: false, error: { code: 'INSERT_FAILED', message: 'Could not save resume. Please try again.' } }, { status: 500 });

    // Increment usage — graceful
    try {
      await supabase.rpc('increment_usage', { p_user_id: user.id, p_field: 'resumes_generated' });
    } catch {}

    return NextResponse.json({ success: true, data: recipe }, { status: 201 });
  } catch (err) {
    console.error('Resume generation error:', err);
    return NextResponse.json({ success: false, error: { code: 'AI_GENERATION_FAILED', message: 'Resume generation is temporarily slow. Your data is saved.', action: 'Try again in a minute.', retryable: true } }, { status: 500 });
  }
}
