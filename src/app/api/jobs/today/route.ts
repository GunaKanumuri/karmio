import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

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
      .from('users').select('country').eq('id', user.id).single();
    const country = profile?.country || 'US';

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    const { data: todayJobs, count: totalToday } = await supabase
      .from('job_postings')
      .select(`
        id, company_name, title, location, remote_type,
        source_type, source_url, ats_board_url,
        salary_min, salary_max, salary_currency,
        sponsorship_status, realness_score,
        first_seen_at, description_raw,
        experience_years_min, experience_years_max,
        dedup_hash, country,
        user_job_matches!left(match_score, matched_skills, missing_skills)
      `, { count: 'exact' })
      .eq('is_active', true)
      .eq('country', country)
      .eq('user_job_matches.user_id', user.id)
      .gte('first_seen_at', todayISO)
      .order('first_seen_at', { ascending: false })
      .limit(30);

    // Flatten match data
    const jobs = (todayJobs || []).map((job: any) => {
      const matchData = Array.isArray(job.user_job_matches)
        ? job.user_job_matches[0] : job.user_job_matches;
      return {
        ...job,
        match_score: matchData?.match_score || 0,
        matched_skills: matchData?.matched_skills || [],
        missing_skills: matchData?.missing_skills || [],
        user_job_matches: undefined,
      };
    });

    jobs.sort((a: any, b: any) => (b.match_score || 0) - (a.match_score || 0));

    let latestBatchCount = 0;
    if (todayJobs && todayJobs.length > 0) {
      const latestTime = new Date(todayJobs[0].first_seen_at).getTime();
      const batchWindow = 5 * 60 * 1000;
      latestBatchCount = todayJobs.filter((j: any) => {
        return Math.abs(new Date(j.first_seen_at).getTime() - latestTime) < batchWindow;
      }).length;
    }

    let lastFetch: string | null = null;
    try {
      const { data: fetchLog } = await supabase
        .from('job_fetch_log')
        .select('created_at')
        .eq('success', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      lastFetch = fetchLog?.created_at || null;
    } catch {}

    return NextResponse.json({
      success: true,
      data: { total_today: totalToday || 0, latest_batch: latestBatchCount, last_fetch: lastFetch, jobs },
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (err) {
    console.error('[GET /api/jobs/today]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.', retryable: true } },
      { status: 500 }
    );
  }
}