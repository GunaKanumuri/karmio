import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/rate-limit/middleware';
import { SubscriptionTier } from '@/types';

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

    const { data: profile } = await supabase
      .from('users')
      .select('subscription_tier, country')
      .eq('id', user.id)
      .single();
    const tier = (profile?.subscription_tier || 'free') as SubscriptionTier;
    const blocked = await applyRateLimit(user.id, tier, 'browse');
    if (blocked) return blocked;

    const url = req.nextUrl.searchParams;
    const search = url.get('search') || '';
    const location = url.get('location') || '';
    const remoteType = url.getAll('remote_type');
    const sponsorship = url.getAll('sponsorship');
    const postedWithin = url.get('posted_within') || '7d';
    const sortBy = url.get('sort_by') || 'match';
    const cursor = url.get('cursor');
    const limit = Math.min(parseInt(url.get('limit') || '30'), 50);
    const country = profile?.country || 'US';

    // Query with LEFT JOIN on user_job_matches
    let query = supabase
      .from('job_postings')
      .select(`
        *,
        job_sources(*),
        user_job_matches!left(
          match_score, skills_score, experience_score,
          education_score, project_score, title_score,
          matched_skills, missing_skills, best_projects,
          target_profile_id
        )
      `, { count: 'exact' })
      .eq('is_active', true)
      .eq('country', country)
      .eq('user_job_matches.user_id', user.id)
      .limit(limit);

    if (search) {
      query = query.or(`title.ilike.%${search}%,company_name.ilike.%${search}%`);
    }
    if (location) {
      query = query.ilike('location', `%${location}%`);
    }
    if (remoteType.length > 0) {
      query = query.in('remote_type', remoteType);
    }
    if (sponsorship.length > 0) {
      query = query.in('sponsorship_status', sponsorship);
    }

    const timeMap: Record<string, number> = {
      '1h': 3600000, '2h': 7200000, '4h': 14400000,
      '1d': 86400000, '2d': 172800000, '7d': 604800000,
      '14d': 1209600000, '30d': 2592000000,
    };
    if (postedWithin in timeMap) {
      const since = new Date(Date.now() - timeMap[postedWithin]).toISOString();
      query = query.gte('first_seen_at', since);
    }

    if (cursor) {
      query = query.lt('first_seen_at', cursor);
    }

    query = query.order('first_seen_at', { ascending: false });

    const { data: rawJobs, error, count } = await query;

    if (error) {
      console.error('[GET /api/jobs] Query error:', error.message);
      return NextResponse.json({
        success: false,
        error: { code: 'QUERY_FAILED', message: 'Could not load jobs.', retryable: true }
      }, { status: 500 });
    }

    // Flatten match data into each job
    const jobs = (rawJobs || []).map((job: any) => {
      const matchData = Array.isArray(job.user_job_matches)
        ? job.user_job_matches[0]
        : job.user_job_matches;

      return {
        ...job,
        match_score: matchData?.match_score || 0,
        skills_score: matchData?.skills_score || 0,
        experience_score: matchData?.experience_score || 0,
        education_score: matchData?.education_score || 0,
        project_score: matchData?.project_score || 0,
        title_score: matchData?.title_score || 0,
        matched_skills: matchData?.matched_skills || [],
        missing_skills: matchData?.missing_skills || [],
        best_projects: matchData?.best_projects || [],
        target_profile_id: matchData?.target_profile_id || null,
        user_job_matches: undefined,
      };
    });

    // Sort by requested order
    if (sortBy === 'match') {
      jobs.sort((a: any, b: any) => (b.match_score || 0) - (a.match_score || 0));
    } else if (sortBy === 'realness') {
      jobs.sort((a: any, b: any) => (b.realness_score || 0) - (a.realness_score || 0));
    }

    const nextCursor = rawJobs && rawJobs.length === limit
      ? rawJobs[rawJobs.length - 1].first_seen_at : null;

    return NextResponse.json({
      success: true,
      data: jobs,
      meta: { total: count, cursor: nextCursor, cached: false, sort: sortBy, country },
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch (err: any) {
    console.error('[GET /api/jobs] Error:', err.message);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.', retryable: true }
    }, { status: 500 });
  }
}