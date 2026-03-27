import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

// Resume export endpoint - generates downloadable resume files
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' }
      }, { status: 401 });
    }

    const format = req.nextUrl.searchParams.get('format') || 'pdf';
    const recipeId = params.id;

    // Fetch resume recipe
    const { data: recipe, error: recipeError } = await supabase
      .from('resume_recipes')
      .select('*, job_postings(*)')
      .eq('id', recipeId)
      .eq('user_id', user.id)
      .single();

    if (recipeError || !recipe) {
      return NextResponse.json({
        success: false,
        error: { code: 'RECIPE_NOT_FOUND', message: 'Resume not found.' }
      }, { status: 404 });
    }

    // Fetch user profile data
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    const { data: experiences } = await supabase
      .from('experiences')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false });

    const { data: education } = await supabase
      .from('education')
      .select('*')
      .eq('user_id', user.id);

    const { data: skills } = await supabase
      .from('skills')
      .select('*')
      .eq('user_id', user.id);

    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id);

    if (format === 'docx') {
      // Use the proper docx-builder (creates real DOCX ZIP via docx npm library)
      const { buildDocxResume } = await import('@/lib/resume-generator/docx-builder');
      const { buffer, filename } = await buildDocxResume({
        user: profile as any,
        experiences: experiences || [],
        projects: projects || [],
        education: education || [],
        recipe: recipe as any,
        skills: (skills || []).map((s: any) => s.skill_name),
      });

      // Convert Node.js Buffer to Uint8Array for NextResponse compatibility
      const uint8 = new Uint8Array(buffer);

      return new NextResponse(uint8, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } else {
      // Generate PDF as printable HTML
      const resumeData = buildResumeData(profile, experiences, education, skills, projects, recipe);
      const pdfContent = generatePDF(resumeData);
      return new NextResponse(pdfContent, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="resume-${(profile?.full_name || 'resume').replace(/\s+/g, '-')}.html"`,
        },
      });
    }
  } catch (err) {
    console.error('Resume export error:', err);
    return NextResponse.json({
      success: false,
      error: { code: 'EXPORT_FAILED', message: 'Could not export resume.' }
    }, { status: 500 });
  }
}

// Build resume data object for PDF generation
function buildResumeData(
  profile: any,
  experiences: any[] | null,
  education: any[] | null,
  skills: any[] | null,
  projects: any[] | null,
  recipe: any,
) {
  return {
    name: profile?.full_name || 'Your Name',
    email: profile?.email || '',
    phone: profile?.phone || '',
    linkedin: profile?.linkedin_url || '',
    github: profile?.github_url || '',
    portfolio: profile?.portfolio_url || '',
    summary: recipe.enhanced_summary || '',
    experiences: (experiences || []).map(exp => ({
      company: exp.company,
      title: exp.title,
      startDate: exp.start_date,
      endDate: exp.end_date,
      bullets: recipe.enhanced_bullets?.[exp.id] || exp.bullets || [],
      isCurrent: exp.is_current,
    })),
    education: (education || []).map(edu => ({
      institution: edu.institution,
      degree: edu.degree,
      field: edu.field,
      graduationDate: edu.graduation_date,
      gpa: edu.gpa,
    })),
    skills: (skills || []).map((s: any) => s.skill_name),
    projects: (projects || []).map(p => ({
      title: p.title,
      description: p.description,
      technologies: p.technologies,
      link: p.github_link,
    })),
    targetJob: recipe.job_postings?.title || '',
    targetCompany: recipe.job_postings?.company_name || '',
  };
}

// Generate PDF as clean printable HTML
function generatePDF(data: any): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 0.5in; }
    body { font-family: 'Inter', Arial, sans-serif; font-size: 11pt; line-height: 1.4; color: #1a1a1a; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 20px; }
    .name { font-size: 24pt; font-weight: 600; margin-bottom: 8px; }
    .contact { font-size: 10pt; color: #666; }
    .section { margin-top: 16px; }
    .section-title { font-size: 12pt; font-weight: 600; color: #4F46E5; border-bottom: 1px solid #4F46E5; padding-bottom: 4px; margin-bottom: 12px; }
    .job { margin-bottom: 12px; }
    .job-title { font-weight: 600; }
    .job-company { color: #666; }
    .job-date { font-size: 10pt; color: #888; }
    .bullets { margin: 8px 0; padding-left: 16px; }
    .bullets li { margin-bottom: 4px; }
    .skills { display: flex; flex-wrap: wrap; gap: 8px; }
    .skill { background: #f3f4f6; padding: 4px 10px; border-radius: 4px; font-size: 10pt; }
  </style>
</head>
<body>
  <div class="header">
    <div class="name">${escapeHtml(data.name)}</div>
    <div class="contact">${[data.email, data.phone, data.linkedin, data.github].filter(Boolean).join(' &bull; ')}</div>
  </div>

  ${data.summary ? `
  <div class="section">
    <div class="section-title">Professional Summary</div>
    <p>${escapeHtml(data.summary)}</p>
  </div>` : ''}

  ${data.experiences.length > 0 ? `
  <div class="section">
    <div class="section-title">Experience</div>
    ${data.experiences.map((exp: any) => `
    <div class="job">
      <div class="job-title">${escapeHtml(exp.title)}</div>
      <div class="job-company">${escapeHtml(exp.company)} <span class="job-date">${formatDate(exp.startDate)} - ${exp.isCurrent ? 'Present' : formatDate(exp.endDate)}</span></div>
      ${exp.bullets?.length ? `<ul class="bullets">${exp.bullets.map((b: string) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>` : ''}
    </div>`).join('')}
  </div>` : ''}

  ${data.education.length > 0 ? `
  <div class="section">
    <div class="section-title">Education</div>
    ${data.education.map((edu: any) => `
    <div class="job">
      <div class="job-title">${escapeHtml(edu.degree)}${edu.field ? ` in ${escapeHtml(edu.field)}` : ''}</div>
      <div class="job-company">${escapeHtml(edu.institution)} ${edu.graduationDate ? `<span class="job-date">${formatDate(edu.graduationDate)}</span>` : ''}</div>
    </div>`).join('')}
  </div>` : ''}

  ${data.skills.length > 0 ? `
  <div class="section">
    <div class="section-title">Skills</div>
    <div class="skills">${data.skills.map((s: string) => `<span class="skill">${escapeHtml(s)}</span>`).join('')}</div>
  </div>` : ''}

  ${data.projects.length > 0 ? `
  <div class="section">
    <div class="section-title">Projects</div>
    ${data.projects.map((proj: any) => `
    <div class="job">
      <div class="job-title">${escapeHtml(proj.title)}</div>
      ${proj.description ? `<p>${escapeHtml(proj.description)}</p>` : ''}
      ${proj.technologies?.length ? `<div style="font-size:10pt;color:#666;">Technologies: ${escapeHtml(proj.technologies.join(', '))}</div>` : ''}
    </div>`).join('')}
  </div>` : ''}
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return (text || '').replace(/[<>&"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}