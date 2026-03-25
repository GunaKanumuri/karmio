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
      .eq('user_id', user.id)
      .limit(3);

    // Build resume data
    const resumeData = {
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
      skills: (skills || []).map(s => s.skill_name),
      projects: (projects || []).map(p => ({
        title: p.title,
        description: p.description,
        technologies: p.technologies,
        link: p.github_link,
      })),
      targetJob: recipe.job_postings?.title || '',
      targetCompany: recipe.job_postings?.company_name || '',
    };

    if (format === 'docx') {
      const docxContent = generateDOCX(resumeData);
      return new NextResponse(docxContent, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="resume-${resumeData.name.replace(/\s+/g, '-')}.docx"`,
        },
      });
    } else {
      // Generate PDF (HTML that can be printed to PDF)
      const pdfContent = generatePDF(resumeData);
      return new NextResponse(pdfContent, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="resume-${resumeData.name.replace(/\s+/g, '-')}.html"`,
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

// Generate DOCX format (returns XML string)
function generateDOCX(data: any): string {
  // Create a simple DOCX-compatible XML
  const content = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>${escapeXml(data.name)}</w:t></w:r></w:p>
    <w:p><w:r><w:t>${escapeXml([data.email, data.phone, data.linkedin].filter(Boolean).join(' | '))}</w:t></w:r></w:p>
    
    ${data.summary ? `
    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Professional Summary</w:t></w:r></w:p>
    <w:p><w:r><w:t>${escapeXml(data.summary)}</w:t></w:r></w:p>
    ` : ''}
    
    ${data.experiences.length > 0 ? `
    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Experience</w:t></w:r></w:p>
    ${data.experiences.map((exp: any) => `
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(exp.title)} at ${escapeXml(exp.company)}</w:t></w:r></w:p>
    <w:p><w:r><w:t>${formatDate(exp.startDate)} - ${exp.isCurrent ? 'Present' : formatDate(exp.endDate)}</w:t></w:r></w:p>
    ${(exp.bullets || []).map((bullet: string) => `<w:p><w:r><w:t>• ${escapeXml(bullet)}</w:t></w:r></w:p>`).join('')}
    `).join('')}
    ` : ''}
    
    ${data.education.length > 0 ? `
    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Education</w:t></w:r></w:p>
    ${data.education.map((edu: any) => `
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(edu.degree)}${edu.field ? ` in ${escapeXml(edu.field)}` : ''}</w:t></w:r></w:p>
    <w:p><w:r><w:t>${escapeXml(edu.institution)}${edu.graduationDate ? ` | ${formatDate(edu.graduationDate)}` : ''}</w:t></w:r></w:p>
    `).join('')}
    ` : ''}
    
    ${data.skills.length > 0 ? `
    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Skills</w:t></w:r></w:p>
    <w:p><w:r><w:t>${escapeXml(data.skills.join(', '))}</w:t></w:r></w:p>
    ` : ''}
    
    ${data.projects.length > 0 ? `
    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Projects</w:t></w:r></w:p>
    ${data.projects.map((proj: any) => `
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(proj.title)}</w:t></w:r></w:p>
    ${proj.description ? `<w:p><w:r><w:t>${escapeXml(proj.description)}</w:t></w:r></w:p>` : ''}
    ${proj.technologies?.length ? `<w:p><w:r><w:t>Technologies: ${escapeXml(proj.technologies.join(', '))}</w:t></w:r></w:p>` : ''}
    `).join('')}
    ` : ''}
  </w:body>
</w:document>`;

  // For a proper DOCX, we'd need to create a ZIP with the correct structure
  // This is a simplified version - in production, use a library like docx
  return content;
}

// Generate PDF format (returns HTML that can be converted or printed)
function generatePDF(data: any): string {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 0.5in; }
    body { font-family: 'Inter', Arial, sans-serif; font-size: 11pt; line-height: 1.4; color: #1a1a1a; }
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
    <div class="contact">${[data.email, data.phone, data.linkedin, data.github].filter(Boolean).join(' • ')}</div>
  </div>

  ${data.summary ? `
  <div class="section">
    <div class="section-title">Professional Summary</div>
    <p>${escapeHtml(data.summary)}</p>
  </div>
  ` : ''}

  ${data.experiences.length > 0 ? `
  <div class="section">
    <div class="section-title">Experience</div>
    ${data.experiences.map((exp: any) => `
    <div class="job">
      <div class="job-title">${escapeHtml(exp.title)}</div>
      <div class="job-company">${escapeHtml(exp.company)} <span class="job-date">${formatDate(exp.startDate)} - ${exp.isCurrent ? 'Present' : formatDate(exp.endDate)}</span></div>
      ${exp.bullets?.length ? `<ul class="bullets">${exp.bullets.map((b: string) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>` : ''}
    </div>
    `).join('')}
  </div>
  ` : ''}

  ${data.education.length > 0 ? `
  <div class="section">
    <div class="section-title">Education</div>
    ${data.education.map((edu: any) => `
    <div class="job">
      <div class="job-title">${escapeHtml(edu.degree)}${edu.field ? ` in ${escapeHtml(edu.field)}` : ''}</div>
      <div class="job-company">${escapeHtml(edu.institution)} ${edu.graduationDate ? `<span class="job-date">${formatDate(edu.graduationDate)}</span>` : ''}</div>
    </div>
    `).join('')}
  </div>
  ` : ''}

  ${data.skills.length > 0 ? `
  <div class="section">
    <div class="section-title">Skills</div>
    <div class="skills">${data.skills.map((s: string) => `<span class="skill">${escapeHtml(s)}</span>`).join('')}</div>
  </div>
  ` : ''}

  ${data.projects.length > 0 ? `
  <div class="section">
    <div class="section-title">Projects</div>
    ${data.projects.map((proj: any) => `
    <div class="job">
      <div class="job-title">${escapeHtml(proj.title)}</div>
      ${proj.description ? `<p>${escapeHtml(proj.description)}</p>` : ''}
      ${proj.technologies?.length ? `<div style="font-size:10pt;color:#666;">Technologies: ${escapeHtml(proj.technologies.join(', '))}</div>` : ''}
    </div>
    `).join('')}
  </div>
  ` : ''}
</body>
</html>`;

  return html;
}

function escapeXml(text: string): string {
  return (text || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
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
