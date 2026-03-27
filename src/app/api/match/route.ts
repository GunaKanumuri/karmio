import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import { calculateMatchScore } from '@/lib/matching/score-calculator';

/**
 * POST /api/match
 *   { mode: 'user' }                  — recompute for current user
 *   { mode: 'batch', secret: '...' }  — recompute all users (cron)
 *   { mode: 'single', job_id: '...' } — single job for current user
 *
 * GET /api/match?job_id=xxx           — get match breakdown
 */

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'user';

    if (mode === 'user' || mode === 'single') {
      const supabase = await createServerSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json(
          { success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } },
          { status: 401 }
        );
      }

      const admin = createAdminClient();
      const result = await computeForUser(admin, user.id, mode === 'single' ? body.job_id : undefined);

      return NextResponse.json({
        success: true,
        data: { ...result, duration_ms: Date.now() - startTime },
      });
    }

    if (mode === 'batch') {
      const secret = req.headers.get('authorization')?.replace('Bearer ', '') || body.secret;
      const cronSecret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (cronSecret && secret !== cronSecret) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid secret.' } },
          { status: 401 }
        );
      }

      const admin = createAdminClient();
      const result = await computeBatch(admin, body.job_ids);

      return NextResponse.json({
        success: true,
        data: { ...result, duration_ms: Date.now() - startTime },
      });
    }

    return NextResponse.json(
      { success: false, error: { code: 'INVALID_MODE', message: 'Use mode: user | batch | single' } },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('[POST /api/match] Error:', err.message);
    return NextResponse.json(
      { success: false, error: { code: 'MATCH_ERROR', message: 'Match computation failed.', retryable: true } },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } },
        { status: 401 }
      );
    }

    const jobId = req.nextUrl.searchParams.get('job_id');
    if (!jobId) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_JOB_ID', message: 'job_id is required.' } },
        { status: 400 }
      );
    }

    const { data: match } = await supabase
      .from('user_job_matches')
      .select('*')
      .eq('user_id', user.id)
      .eq('job_id', jobId)
      .single();

    if (!match) {
      // Compute on-demand
      const admin = createAdminClient();
      await computeForUser(admin, user.id, jobId);
      const { data: freshMatch } = await supabase
        .from('user_job_matches')
        .select('*')
        .eq('user_id', user.id)
        .eq('job_id', jobId)
        .single();

      return NextResponse.json({ success: true, data: freshMatch });
    }

    return NextResponse.json({ success: true, data: match });
  } catch (err: any) {
    console.error('[GET /api/match] Error:', err.message);
    return NextResponse.json(
      { success: false, error: { code: 'MATCH_ERROR', message: 'Could not load match data.' } },
      { status: 500 }
    );
  }
}


// =============================================================================
// COMPUTE FOR USER
// =============================================================================
async function computeForUser(
  supabase: any,
  userId: string,
  singleJobId?: string
): Promise<{ computed: number; skipped: number }> {
  const [profileRes, experiencesRes, projectsRes, targetProfilesRes] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).single(),
    supabase.from('experiences').select('*').eq('user_id', userId),
    supabase.from('projects').select('*').eq('user_id', userId),
    supabase.from('target_profiles').select('*').eq('user_id', userId),
  ]);

  const profile = profileRes.data;
  const experiences = experiencesRes.data || [];
  const projects = projectsRes.data || [];
  const targetProfiles = targetProfilesRes.data || [];

  if (!profile) return { computed: 0, skipped: 0 };

  const userSkills = collectUserSkills(experiences, projects, targetProfiles);
  const primaryProfile = targetProfiles.find((tp: any) => tp.is_primary) || targetProfiles[0];

  let jobQuery = supabase
    .from('job_postings')
    .select('id, title, description_parsed, location, remote_type, experience_years_min, experience_years_max')
    .eq('is_active', true)
    .eq('country', profile.country || 'US');

  if (singleJobId) {
    jobQuery = jobQuery.eq('id', singleJobId);
  } else {
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();
    jobQuery = jobQuery.gte('first_seen_at', twoWeeksAgo).limit(500);
  }

  const { data: jobs } = await jobQuery;
  if (!jobs || jobs.length === 0) return { computed: 0, skipped: 0 };

  let computed = 0;
  let skipped = 0;

  const batchSize = 50;
  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);
    const upsertRows: any[] = [];

    for (const job of batch) {
      try {
        const parsedJD = job.description_parsed || {
          required_skills: [], preferred_skills: [], responsibilities: [],
          education_requirements: [],
          experience_years: { min: job.experience_years_min || 0, max: job.experience_years_max || null },
          keywords: [],
        };

        const result = calculateMatchScore(
          parsedJD, userSkills, experiences, projects, [],
          primaryProfile || { target_titles: [], priority_skills: [], profile_name: '' }
        );

        upsertRows.push({
          user_id: userId, job_id: job.id,
          match_score: result.total_score,
          skills_score: result.skills_score,
          experience_score: result.experience_score,
          education_score: result.education_score,
          project_score: result.project_score,
          title_score: result.title_score,
          matched_skills: result.matched_skills,
          missing_skills: result.missing_skills,
          best_projects: result.best_projects,
          target_profile_id: primaryProfile?.id || null,
          computed_at: new Date().toISOString(),
        });
        computed++;
      } catch { skipped++; }
    }

    if (upsertRows.length > 0) {
      const { error } = await supabase
        .from('user_job_matches')
        .upsert(upsertRows, { onConflict: 'user_id,job_id', ignoreDuplicates: false });
      if (error) console.error('[match] Upsert error:', error.message);
    }
  }

  return { computed, skipped };
}

// =============================================================================
// COMPUTE BATCH
// =============================================================================
async function computeBatch(
  supabase: any,
  jobIds?: string[]
): Promise<{ users_processed: number; total_computed: number }> {
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('onboarding_complete', true)
    .limit(200);

  if (!users || users.length === 0) return { users_processed: 0, total_computed: 0 };

  let totalComputed = 0;
  for (const user of users) {
    if (jobIds && jobIds.length > 0) {
      for (const jobId of jobIds.slice(0, 100)) {
        const result = await computeForUser(supabase, user.id, jobId);
        totalComputed += result.computed;
      }
    } else {
      const result = await computeForUser(supabase, user.id);
      totalComputed += result.computed;
    }
  }

  return { users_processed: users.length, total_computed: totalComputed };
}

// =============================================================================
// HELPERS
// =============================================================================
function collectUserSkills(experiences: any[], projects: any[], targetProfiles: any[]): string[] {
  const skillSet = new Set<string>();
  for (const exp of experiences) {
    if (exp.technologies) for (const tech of exp.technologies) skillSet.add(tech.toLowerCase().trim());
  }
  for (const proj of projects) {
    if (proj.technologies) for (const tech of proj.technologies) skillSet.add(tech.toLowerCase().trim());
  }
  for (const tp of targetProfiles) {
    if (tp.priority_skills) for (const skill of tp.priority_skills) skillSet.add(skill.toLowerCase().trim());
  }
  return [...skillSet];
}