import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * POST /api/profile/upload-resume/save
 * Takes parsed resume data and saves to DB tables:
 * - users (name, phone, linkedin, github, portfolio, location)
 * - experiences (UPSERT — merges with existing, does NOT skip)
 * - projects (UPSERT — merges with existing)
 * - education (UPSERT — merges with existing)
 * - skills (UPSERT — adds new, keeps existing)
 *
 * Called after /api/profile/upload-resume parses the file.
 *
 * Optional query param: ?mode=merge (default) | replace
 *   merge  = add new entries alongside existing ones
 *   replace = delete existing entries first, then insert parsed ones
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
    const mode = new URL(req.url).searchParams.get('mode') || 'merge';
    const results = { profile: false, experiences: 0, projects: 0, education: 0, skills: 0 };

    // 1. Update user profile fields (always upsert — latest resume wins for contact info)
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

    // 2. Insert experiences (merge: dedupe by company+title, replace: clear first)
    if (parsed.experiences && parsed.experiences.length > 0) {
      if (mode === 'replace') {
        await supabase.from('experiences').delete().eq('user_id', user.id);
      }

      // Get existing to dedupe in merge mode
      const { data: existing } = await supabase
        .from('experiences').select('company, title').eq('user_id', user.id);
      const existingKeys = new Set(
        (existing || []).map((e: any) => `${(e.company || '').toLowerCase()}::${(e.title || '').toLowerCase()}`)
      );

      const newRows = parsed.experiences
        .filter((exp: any) => {
          if (mode === 'replace') return true;
          const key = `${(exp.company || '').toLowerCase()}::${(exp.title || '').toLowerCase()}`;
          return !existingKeys.has(key);
        })
        .map((exp: any) => ({
          user_id: user.id,
          company: exp.company || 'Unknown',
          title: exp.title || 'Unknown',
          start_date: exp.start_date || new Date().toISOString().slice(0, 10),
          end_date: exp.end_date || null,
          bullets: exp.bullets || [],
          technologies: exp.technologies || [],
          is_current: exp.is_current || false,
        }));

      if (newRows.length > 0) {
        const { data } = await supabase.from('experiences').insert(newRows).select('id');
        results.experiences = data?.length || 0;
      }
    }

    // 3. Insert projects (merge: dedupe by title, replace: clear first)
    if (parsed.projects && parsed.projects.length > 0) {
      if (mode === 'replace') {
        await supabase.from('projects').delete().eq('user_id', user.id);
      }

      const { data: existing } = await supabase
        .from('projects').select('title').eq('user_id', user.id);
      const existingTitles = new Set(
        (existing || []).map((p: any) => (p.title || '').toLowerCase())
      );

      const newRows = parsed.projects
        .filter((proj: any) => {
          if (mode === 'replace') return true;
          return !existingTitles.has((proj.title || '').toLowerCase());
        })
        .map((proj: any) => ({
          user_id: user.id,
          title: proj.title || 'Untitled Project',
          description: proj.description || '',
          technologies: proj.technologies || [],
          contributions: proj.contributions || '',
          results: proj.results || '',
          github_link: proj.github_link || null,
          project_type: proj.project_type || 'personal',
        }));

      if (newRows.length > 0) {
        const { data } = await supabase.from('projects').insert(newRows).select('id');
        results.projects = data?.length || 0;
      }
    }

    // 4. Insert education (merge: dedupe by institution+degree, replace: clear first)
    if (parsed.education && parsed.education.length > 0) {
      if (mode === 'replace') {
        await supabase.from('education').delete().eq('user_id', user.id);
      }

      const { data: existing } = await supabase
        .from('education').select('institution, degree').eq('user_id', user.id);
      const existingKeys = new Set(
        (existing || []).map((e: any) => `${(e.institution || '').toLowerCase()}::${(e.degree || '').toLowerCase()}`)
      );

      const newRows = parsed.education
        .filter((edu: any) => {
          if (mode === 'replace') return true;
          const key = `${(edu.institution || '').toLowerCase()}::${(edu.degree || '').toLowerCase()}`;
          return !existingKeys.has(key);
        })
        .map((edu: any) => ({
          user_id: user.id,
          institution: edu.institution || 'Unknown',
          degree: edu.degree || 'Unknown',
          field: edu.field || '',
          graduation_date: edu.graduation_date || null,
          gpa: edu.gpa || null,
        }));

      if (newRows.length > 0) {
        const { data } = await supabase.from('education').insert(newRows).select('id');
        results.education = data?.length || 0;
      }
    }

    // 5. Insert skills (always merge — upsert with ON CONFLICT)
    if (parsed.skills && parsed.skills.length > 0) {
      const rows = parsed.skills.map((skill: string) => ({
        user_id: user.id,
        skill_name: skill,
        skill_category: 'technical',
      }));

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