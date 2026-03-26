import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } },
        { status: 401 }
      );
    }

    // Fetch the job posting
    const { data: job, error: jobError } = await supabase
      .from('job_postings')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'JOB_NOT_FOUND',
            message: 'This job appears to have been filled or removed.',
            action: 'Browse other jobs in the feed.',
          },
        },
        { status: 404 }
      );
    }

    // Fetch job sources
    const { data: sources } = await supabase
      .from('job_sources')
      .select('*')
      .eq('job_id', jobId);

    // Fetch pre-calculated match score
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

    // Check for existing application (so UI can pre-populate saved/applied state)
    const { data: application } = await supabase
      .from('applications')
      .select('id, status, resume_recipe_id')
      .eq('user_id', user.id)
      .eq('job_id', jobId)
      .maybeSingle();

    // Enrich with company details if available
    const companySlug = job.company_name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    const { data: companyDetails } = await supabase
      .from('company_details')
      .select('career_page_url, ats_board_url, open_roles_count, sponsorship_signal, company_size')
      .eq('company_slug', companySlug)
      .maybeSingle();

    const response = NextResponse.json({
      success: true,
      data: {
        ...job,
        sources: sources || [],
        match_score: matchScore,
        application: application || null,
        // Enrich with company details when available
        company_slug: companySlug,
        company_career_url: companyDetails?.career_page_url || job.ats_board_url || null,
        company_open_roles: companyDetails?.open_roles_count ?? null,
        company_size: companyDetails?.company_size ?? null,
        // Use company-level sponsorship signal as fallback if job-level is 'unknown'
        sponsorship_status:
          job.sponsorship_status !== 'unknown'
            ? job.sponsorship_status
            : (companyDetails?.sponsorship_signal || 'unknown'),
      },
    });

    // Cache: 10 min shared, 20 min stale-while-revalidate
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