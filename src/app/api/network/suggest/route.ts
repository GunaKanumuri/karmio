import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * POST /api/network/suggest
 * Auto-generates outreach suggestions when a user applies to a job.
 * Called automatically after application creation.
 * 
 * Body: { application_id, job_id }
 * 
 * What it does:
 * 1. Looks up company domain from company_details
 * 2. Generates LinkedIn search URL for the company
 * 3. Suggests roles to search for based on the job title
 * 4. Drafts HR and technical outreach messages
 * 5. Stores everything in outreach_suggestions
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { application_id, job_id } = body;

    if (!application_id || !job_id) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_FIELDS', message: 'application_id and job_id required.' } },
        { status: 400 }
      );
    }

    // Get job details
    const { data: job } = await supabase
      .from('job_postings')
      .select('id, company_name, title, location, source_type, ats_board_url')
      .eq('id', job_id)
      .single();

    if (!job) {
      return NextResponse.json(
        { success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found.' } },
        { status: 404 }
      );
    }

    // Get user profile for personalized drafts
    const { data: profile } = await supabase
      .from('users')
      .select('full_name, current_location')
      .eq('id', user.id)
      .single();

    const userName = profile?.full_name || 'there';
    const companyName = job.company_name;
    const jobTitle = job.title;
    const companySlug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Try to get company details for domain
    const { data: companyDetails } = await supabase
      .from('company_details')
      .select('company_domain, company_slug')
      .eq('company_name', companyName)
      .single();

    const companyDomain = companyDetails?.company_domain || `${companySlug}.com`;
    const companyLinkedIn = `https://www.linkedin.com/company/${companySlug}/people/`;

    // Determine relevant roles to search based on job title
    const suggestedRoles = generateSuggestedRoles(jobTitle);

    // Generate LinkedIn search URL
    const linkedinSearchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(companyName)}&origin=SWITCH_SEARCH_VERTICAL`;

    // Generate draft messages
    const hrDraft = generateHRDraft(userName, companyName, jobTitle);
    const technicalDraft = generateTechnicalDraft(userName, companyName, jobTitle);

    // Generate guidance text
    const searchGuidance = generateSearchGuidance(companyName, jobTitle, suggestedRoles);

    // Check if suggestion already exists
    const { data: existing } = await supabase
      .from('outreach_suggestions')
      .select('id')
      .eq('application_id', application_id)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      // Update existing
      const { data: updated } = await supabase
        .from('outreach_suggestions')
        .update({
          suggested_roles: suggestedRoles,
          hr_draft: hrDraft,
          technical_draft: technicalDraft,
          search_guidance: searchGuidance,
          linkedin_search_url: linkedinSearchUrl,
          company_domain: companyDomain,
          company_linkedin_url: companyLinkedIn,
        })
        .eq('id', existing.id)
        .select()
        .single();

      return NextResponse.json({ success: true, data: updated });
    }

    // Create new suggestion
    const { data: suggestion, error } = await supabase
      .from('outreach_suggestions')
      .insert({
        user_id: user.id,
        application_id,
        job_id,
        company_name: companyName,
        company_domain: companyDomain,
        company_linkedin_url: companyLinkedIn,
        suggested_roles: suggestedRoles,
        hr_draft: hrDraft,
        technical_draft: technicalDraft,
        search_guidance: searchGuidance,
        linkedin_search_url: linkedinSearchUrl,
        outreach_status: 'message_drafted',
      })
      .select()
      .single();

    if (error) {
      console.error('[POST /api/network/suggest] Insert error:', error.message);
      return NextResponse.json(
        { success: false, error: { code: 'INSERT_FAILED', message: 'Could not create outreach suggestion.' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: suggestion }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/network/suggest] Error:', err.message);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/network/suggest?application_id=xxx
 * Get outreach suggestion for a specific application
 * 
 * GET /api/network/suggest
 * Get all outreach suggestions for the user
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

    const appId = req.nextUrl.searchParams.get('application_id');

    if (appId) {
      const { data } = await supabase
        .from('outreach_suggestions')
        .select('*, applications(status, job_postings(title, company_name, location))')
        .eq('application_id', appId)
        .eq('user_id', user.id)
        .single();

      return NextResponse.json({ success: true, data });
    }

    // All suggestions, grouped by status
    const { data } = await supabase
      .from('outreach_suggestions')
      .select('*, applications(status, job_postings(title, company_name, location, source_url))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    return NextResponse.json({ success: true, data: data || [] });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/network/suggest
 * Update outreach status
 * Body: { id, outreach_status, notes? }
 */
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { id, outreach_status, notes } = body;

    const updates: any = { outreach_status };
    if (notes) updates.notes = notes;
    if (outreach_status === 'sent') updates.sent_at = new Date().toISOString();
    if (outreach_status === 'responded') updates.response_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('outreach_suggestions')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: { code: 'UPDATE_FAILED', message: 'Could not update.' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }
}


// =============================================================================
// HELPERS — Role suggestions, draft messages, guidance
// =============================================================================

function generateSuggestedRoles(jobTitle: string): any[] {
  const title = jobTitle.toLowerCase();
  const roles: any[] = [];

  // Always suggest HR/Recruiter
  roles.push({
    role: 'Technical Recruiter',
    why: 'Recruiters are your fastest path to getting your resume reviewed.',
    searchTip: 'Search "[Company] Technical Recruiter" on LinkedIn',
    source: 'suggested',
  });

  // Role-specific suggestions
  if (title.includes('engineer') || title.includes('developer') || title.includes('sre') || title.includes('devops')) {
    roles.push({
      role: 'Engineering Manager',
      why: 'Hiring managers have direct influence on who gets interviewed.',
      searchTip: 'Search "[Company] Engineering Manager" on LinkedIn',
      source: 'suggested',
    });
    roles.push({
      role: 'Senior Software Engineer',
      why: 'Senior engineers on the team can refer you internally.',
      searchTip: 'Search "[Company] Senior Engineer" on LinkedIn',
      source: 'suggested',
    });
  } else if (title.includes('data') || title.includes('ml') || title.includes('machine learning')) {
    roles.push({
      role: 'Data Engineering Manager',
      why: 'Data team leads often drive hiring decisions.',
      searchTip: 'Search "[Company] Data Manager" on LinkedIn',
      source: 'suggested',
    });
  } else if (title.includes('design') || title.includes('ux')) {
    roles.push({
      role: 'Design Manager',
      why: 'Design leads review portfolios and drive hiring.',
      searchTip: 'Search "[Company] Head of Design" on LinkedIn',
      source: 'suggested',
    });
  } else if (title.includes('product') || title.includes('pm')) {
    roles.push({
      role: 'Director of Product',
      why: 'Product leadership shapes team hiring priorities.',
      searchTip: 'Search "[Company] VP Product" on LinkedIn',
      source: 'suggested',
    });
  } else {
    roles.push({
      role: 'Hiring Manager',
      why: 'The person who will directly manage this role.',
      searchTip: 'Search "[Company] [Department] Manager" on LinkedIn',
      source: 'suggested',
    });
  }

  // Always suggest HR/People team
  roles.push({
    role: 'HR / People Operations',
    why: 'HR can fast-track your application through the system.',
    searchTip: 'Search "[Company] People Operations" on LinkedIn',
    source: 'suggested',
  });

  return roles;
}

function generateHRDraft(userName: string, companyName: string, jobTitle: string): string {
  return `Hi there,

I recently applied for the ${jobTitle} position at ${companyName} and wanted to reach out directly. I'm genuinely excited about this opportunity and believe my background aligns well with what the team is looking for.

I'd love to learn more about the role and the team. Would you be open to a brief conversation?

Thank you for your time!
${userName}`;
}

function generateTechnicalDraft(userName: string, companyName: string, jobTitle: string): string {
  return `Hi,

I came across the ${jobTitle} role at ${companyName} and it immediately caught my attention. I've been following the work your team has been doing, and the technical challenges seem really interesting.

I recently applied and would love to hear more about what the team is currently focused on. As someone who's passionate about building great products, I think there could be a strong fit.

Would you be open to connecting?

Best,
${userName}`;
}

function generateSearchGuidance(companyName: string, jobTitle: string, roles: any[]): string {
  const roleList = roles.map(r => r.role).join(', ');
  return `To maximize your chances for the ${jobTitle} role at ${companyName}:

1. Go to ${companyName}'s LinkedIn company page → "People" tab
2. Search for: ${roleList}
3. Send a connection request with the HR or Technical draft message below
4. If you find their email (check their LinkedIn "Contact info"), send the email version instead — emails get 2x more responses than LinkedIn messages
5. Follow up after 3-5 days if no response`;
}