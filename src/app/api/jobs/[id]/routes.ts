import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } },
        { status: 401 }
      );
    }

    const jobId = params.id;

    // Fetch job posting
    const { data: job, error: jobError } = await supabase
      .from('job_postings')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { success: false, error: { code: 'JOB_NOT_FOUND', message: 'This job appears to have been filled or removed.', action: 'Browse other jobs in the feed.' } },
        { status: 404 }
      );
    }

    // Fetch sources for this job
    const { data: sources } = await supabase
      .from('job_sources')
      .select('*')
      .eq('job_id', jobId);

    // Check if user has a pre-calculated match score
    let matchScore = 0;
    const { data: matchData } = await supabase
      .from('user_job_matches')
      .select('match_score')
      .eq('user_id', user.id)
      .eq('job_id', jobId)
      .maybeSingle();

    if (matchData) {
      matchScore = matchData.match_score;
    }

    // Check if user already has an application for this job
    const { data: application } = await supabase
      .from('applications')
      .select('id, status, resume_recipe_id')
      .eq('user_id', user.id)
      .eq('job_id', jobId)
      .maybeSingle();

    const response = NextResponse.json({
      success: true,
      data: {
        ...job,
        sources: sources || [],
        match_score: matchScore,
        application: application || null,
      },
    });

    // Cache headers per spec: shared 10min, stale-while-revalidate 20min
    response.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
    response.headers.set('CDN-Cache-Control', 'public, max-age=600');

    return response;
  } catch (err) {
    console.error('[GET /api/jobs/[id]]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.', retryable: true } },
      { status: 500 }
    );
  }
}