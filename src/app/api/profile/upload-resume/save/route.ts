import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * POST /api/profile/upload-resume/save
 * Takes parsed resume data and saves to DB tables:
 * - users (name, phone, linkedin, github, portfolio, location)
 * - experiences
 * - projects
 * - education
 * - skills
 * 
 * Called after /api/profile/upload-resume parses the file.
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

    const parsed = await req.json();
    const results = { profile: false, experiences: 0, projects: 0, education: 0, skills: 0 };

    // 1. Update user profile
    const profileFields: Record<string, any> = {};
    if (parsed.full_name) profileFields.full_name = parsed.full_name;
    if (parsed.phone) profileFields.phone = parsed.phone;
    if (parsed.linkedin_url) profileFields.linkedin_url = parsed.linkedin_url;
    if (parsed.github_url) profileFields.github_url = parsed.github_url;
    if (parsed.portfolio_url) profileFields.portfolio_url = parsed.portfolio_url;
    if (parsed.current_location) profileFields.current_location = parsed.current_location;

    if (Object.keys(profileFields).length > 0) {
      const { error } = await supabase.from('users').update(profileFields).eq('id', user.id);
      if (!error) results.profile = true;
    }

    // 2. Insert experiences (skip if user already has some)
    if (parsed.experiences && parsed.experiences.length > 0) {
      const { data: existing } = await supabase
        .from('experiences').select('id').eq('user_id', user.id).limit(1);

      if (!existing || existing.length === 0) {
        const rows = parsed.experiences.map((exp: any) => ({
          user_id: user.id,
          company: exp.company || 'Unknown',
          title: exp.title || 'Unknown',
          start_date: exp.start_date || new Date().toISOString().slice(0, 10),
          end_date: exp.end_date || null,
          bullets: exp.bullets || [],
          technologies: exp.technologies || [],
          is_current: exp.is_current || false,
        }));

        const { data } = await supabase.from('experiences').insert(rows).select('id');
        results.experiences = data?.length || 0;
      }
    }

    // 3. Insert projects
    if (parsed.projects && parsed.projects.length > 0) {
      const { data: existing } = await supabase
        .from('projects').select('id').eq('user_id', user.id).limit(1);

      if (!existing || existing.length === 0) {
        const rows = parsed.projects.map((proj: any) => ({
          user_id: user.id,
          title: proj.title || 'Untitled Project',
          description: proj.description || '',
          technologies: proj.technologies || [],
          contributions: proj.contributions || '',
          results: proj.results || '',
          github_link: proj.github_link || null,
          project_type: proj.project_type || 'personal',
        }));

        const { data } = await supabase.from('projects').insert(rows).select('id');
        results.projects = data?.length || 0;
      }
    }

    // 4. Insert education
    if (parsed.education && parsed.education.length > 0) {
      const { data: existing } = await supabase
        .from('education').select('id').eq('user_id', user.id).limit(1);

      if (!existing || existing.length === 0) {
        const rows = parsed.education.map((edu: any) => ({
          user_id: user.id,
          institution: edu.institution || 'Unknown',
          degree: edu.degree || 'Unknown',
          field: edu.field || '',
          graduation_date: edu.graduation_date || null,
          gpa: edu.gpa || null,
        }));

        const { data } = await supabase.from('education').insert(rows).select('id');
        results.education = data?.length || 0;
      }
    }

    // 5. Insert skills
    if (parsed.skills && parsed.skills.length > 0) {
      const rows = parsed.skills.map((skill: string) => ({
        user_id: user.id,
        skill_name: skill,
        skill_category: 'technical',
      }));

      // Use ON CONFLICT to skip duplicates
      const { data } = await supabase
        .from('skills')
        .upsert(rows, { onConflict: 'user_id,skill_name', ignoreDuplicates: true })
        .select('id');
      results.skills = data?.length || 0;
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Saved: ${results.experiences} experiences, ${results.projects} projects, ${results.education} education, ${results.skills} skills`,
    });
  } catch (err: any) {
    console.error('[POST /api/profile/upload-resume/save]', err.message);
    return NextResponse.json(
      { success: false, error: { code: 'SAVE_FAILED', message: 'Could not save resume data.' } },
      { status: 500 }
    );
  }
}