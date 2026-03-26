import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * GET /api/jobs/today
 * Returns today's job stats: total jobs fetched today,
 * latest batch count (delta), and the jobs themselves.
 */
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

    // Get user's country
    const { data: profile } = await supabase
      .from('users')
      .select('country')
      .eq('id', user.id)
      .single();

    const country = profile?.country || 'US';

    // Today's midnight
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    // Get all jobs first seen today for this country
    const { data: todayJobs, count: totalToday } = await supabase
      .from('job_postings')
      .select('id, company_name, title, location, remote_type, source_type, source_url, ats_board_url, salary_min, salary_max, salary_currency, sponsorship_status, realness_score, first_seen_at, description_raw, experience_years_min, experience_years_max, dedup_hash, country', { count: 'exact' })
      .eq('is_active', true)
      .eq('country', country)
      .gte('first_seen_at', todayISO)
      .order('first_seen_at', { ascending: false })
      .limit(30);

    // Compute latest batch delta:
    // Find the most recent fetch timestamp (latest first_seen_at rounded to nearest hour)
    // Then count how many jobs share that approximate timestamp (within 5 min window)
    let latestBatchCount = 0;
    if (todayJobs && todayJobs.length > 0) {
      const latestTime = new Date(todayJobs[0].first_seen_at).getTime();
      // Jobs within 5 minutes of the latest are from the same batch
      const batchWindow = 5 * 60 * 1000;
      latestBatchCount = todayJobs.filter(j => {
        const t = new Date(j.first_seen_at).getTime();
        return Math.abs(t - latestTime) < batchWindow;
      }).length;
    }

    return NextResponse.json({
      success: true,
      data: {
        total_today: totalToday || 0,
        latest_batch: latestBatchCount,
        jobs: todayJobs || [],
      },
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    console.error('[GET /api/jobs/today]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.', retryable: true } },
      { status: 500 }
    );
  }
}