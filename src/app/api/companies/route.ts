import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * GET /api/companies?slug=stripe
 * Returns enriched company details from company_details table.
 * Cached for 1 hour — data is refreshed by the job fetcher cron.
 *
 * Falls back to deriving minimal info from job_postings if the
 * company isn't in company_details yet.
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

    const slug = req.nextUrl.searchParams.get('slug');
    const name = req.nextUrl.searchParams.get('name'); // fallback lookup by name

    if (!slug && !name) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_PARAM', message: 'Provide slug or name query param.' } },
        { status: 400 }
      );
    }

    // ── Primary: company_details table ──────────────────────────────────────
    let query = supabase.from('company_details').select('*');
    if (slug) {
      query = query.eq('company_slug', slug);
    } else {
      query = query.ilike('company_name', `%${name}%`);
    }

    const { data: company } = await query.maybeSingle();

    if (company) {
      return NextResponse.json({ success: true, data: company }, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      });
    }

    // ── Fallback: derive from job_postings ──────────────────────────────────
    // If company isn't in the details table yet, compute on the fly from jobs
    const nameFilter = name || (slug ? slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '');

    const { data: jobs, count } = await supabase
      .from('job_postings')
      .select('id, company_name, source_type, ats_board_url, source_url, sponsorship_status, location, country', { count: 'exact' })
      .ilike('company_name', `%${nameFilter}%`)
      .eq('is_active', true)
      .limit(50);

    if (!jobs || jobs.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'COMPANY_NOT_FOUND', message: 'Company not found.' } },
        { status: 404 }
      );
    }

    // Derive sponsorship signal from job descriptions
    const sponsorYes = jobs.filter(j => j.sponsorship_status === 'yes').length;
    const sponsorNo = jobs.filter(j => j.sponsorship_status === 'no').length;
    let sponsorSignal: 'yes' | 'no' | 'unknown' = 'unknown';
    let sponsorNotes = 'Check individual job listings for sponsorship details.';

    if (sponsorYes > 0) {
      sponsorSignal = 'yes';
      sponsorNotes = `${sponsorYes} of ${count} current postings mention visa sponsorship.`;
    } else if (sponsorNo > jobs.length * 0.3) {
      sponsorSignal = 'no';
      sponsorNotes = `Most current postings indicate no sponsorship.`;
    }

    const firstJob = jobs[0];
    const derivedCompany = {
      company_slug: slug || nameFilter.toLowerCase().replace(/\s+/g, '-'),
      company_name: firstJob.company_name,
      company_domain: null,
      ats_type: firstJob.source_type,
      career_page_url: firstJob.ats_board_url || firstJob.source_url,
      ats_board_url: firstJob.ats_board_url,
      open_roles_count: count || jobs.length,
      open_roles_eng: null,
      sponsorship_signal: sponsorSignal,
      sponsorship_notes: sponsorNotes,
      company_size: null,
      industry: null,
      hq_location: firstJob.location,
      country: firstJob.country,
      last_fetched_at: null,
      // Signal that this is derived, not from cache
      _derived: true,
    };

    return NextResponse.json({ success: true, data: derivedCompany }, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    });
  } catch (err) {
    console.error('[GET /api/companies]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }
}