import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/rate-limit/middleware';
import { updateProfileSchema, validateInput } from '@/lib/validation/schemas';
import { SubscriptionTier } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } }, { status: 401 });

    const { data: profile, error } = await supabase
      .from('users')
      .select('*, target_profiles(*)')
      .eq('id', user.id)
      .single();

    if (error) return NextResponse.json({ success: false, error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found.' } }, { status: 404 });

    const [expRes, projRes, eduRes, skillsRes] = await Promise.all([
      supabase.from('experiences').select('*').eq('user_id', user.id).order('start_date', { ascending: false }),
      supabase.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('education').select('*').eq('user_id', user.id),
      supabase.from('skills').select('*').eq('user_id', user.id),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...profile,
        experiences: expRes.data || [],
        projects: projRes.data || [],
        education: eduRes.data || [],
        skills: skillsRes.data || [],
      },
    }, { headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } }, { status: 401 });

    // Rate limit: profile updates
    const { data: userProfile } = await supabase.from('users').select('subscription_tier').eq('id', user.id).single();
    const tier = (userProfile?.subscription_tier || 'free') as SubscriptionTier;
    const blocked = await applyRateLimit(user.id, tier, 'profile');
    if (blocked) return blocked;

    const body = await req.json();
    const validation = validateInput(updateProfileSchema, body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: validation.error } }, { status: 400 });
    }
    const { experiences, projects, education, skills, target_profile, ...profileData } = validation.data as any;

    // Update user profile
    if (Object.keys(profileData).length > 0) {
      const allowedFields = ['full_name', 'phone', 'linkedin_url', 'github_url', 'portfolio_url',
        'visa_status', 'country', 'current_location', 'target_locations', 'onboarding_complete'];
      
      const filtered: Record<string, any> = {};
      allowedFields.forEach(f => {
        if (f in profileData) filtered[f] = profileData[f];
      });

      if (Object.keys(filtered).length > 0) {
        // Upsert: creates the row if the handle_new_user trigger didn't fire
        // (e.g. user signed up before the schema was applied)
        const upsertPayload = { id: user.id, email: user.email, ...filtered };
        const { error } = await supabase
          .from('users')
          .upsert(upsertPayload, { onConflict: 'id' });
        if (error) {
          console.error('Profile update error:', error);
          return NextResponse.json({ success: false, error: { code: 'UPDATE_FAILED', message: 'Could not update profile.' } }, { status: 500 });
        }

        // Bootstrap dependent rows in case they're also missing
        await Promise.all([
          supabase.from('user_settings').upsert({ user_id: user.id }, { onConflict: 'user_id' }),
          supabase.from('weekly_usage').upsert(
            { user_id: user.id, week_start: new Date(Date.now() - ((new Date().getDay() || 7) - 1) * 86400000).toISOString().slice(0, 10) },
            { onConflict: 'user_id,week_start' }
          ),
        ]);
      }

    }

    // Upsert target profile
    if (target_profile && target_profile.profile_name) {
      const { data: existing } = await supabase
        .from('target_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .single();

      const profilePayload = {
        profile_name: target_profile.profile_name,
        target_titles: target_profile.target_titles || [],
        priority_skills: target_profile.priority_skills || [],
        career_field: target_profile.career_field || null,
        career_stage: target_profile.career_stage || null,
        job_types: target_profile.job_types || [],
        company_types: target_profile.company_types || [],
      };

      if (existing) {
        await supabase.from('target_profiles').update(profilePayload)
          .eq('id', existing.id).eq('user_id', user.id);
      } else {
        await supabase.from('target_profiles').insert({
          user_id: user.id,
          ...profilePayload,
          is_primary: target_profile.is_primary !== false,
        });
      }
    }

    // Upsert experiences
    if (experiences && Array.isArray(experiences)) {
      for (const exp of experiences) {
        if (exp.id) {
          await supabase.from('experiences').update({
            company: exp.company, title: exp.title, start_date: exp.start_date,
            end_date: exp.end_date, bullets: exp.bullets, technologies: exp.technologies,
            is_current: exp.is_current,
          }).eq('id', exp.id).eq('user_id', user.id);
        } else if (exp.company && exp.title) {
          await supabase.from('experiences').insert({
            user_id: user.id, company: exp.company, title: exp.title,
            start_date: exp.start_date || null,
            end_date: exp.end_date || null,
            bullets: exp.bullets || [], technologies: exp.technologies || [],
            is_current: exp.is_current || false,
          });
        }
      }
    }

    // Upsert projects
    if (projects && Array.isArray(projects)) {
      for (const proj of projects) {
        if (proj.id) {
          await supabase.from('projects').update({
            title: proj.title, description: proj.description,
            technologies: proj.technologies, contributions: proj.contributions,
            results: proj.results, github_link: proj.github_link, project_type: proj.project_type,
          }).eq('id', proj.id).eq('user_id', user.id);
        } else if (proj.title) {
          await supabase.from('projects').insert({
            user_id: user.id, title: proj.title, description: proj.description || '',
            technologies: proj.technologies || [], contributions: proj.contributions || '',
            results: proj.results || '', github_link: proj.github_link || null,
            project_type: proj.project_type || 'personal',
          });
        }
      }
    }

    // Upsert education
    if (education && Array.isArray(education)) {
      for (const edu of education) {
        if (edu.id) {
          await supabase.from('education').update({
            institution: edu.institution, degree: edu.degree,
            field: edu.field, graduation_date: edu.graduation_date, gpa: edu.gpa,
          }).eq('id', edu.id).eq('user_id', user.id);
        } else if (edu.institution && edu.degree) {
          await supabase.from('education').insert({
            user_id: user.id, institution: edu.institution, degree: edu.degree,
            field: edu.field || '', graduation_date: edu.graduation_date || null, gpa: edu.gpa || null,
          });
        }
      }
    }

    // Upsert skills
    if (skills && Array.isArray(skills)) {
      await supabase.from('skills').delete().eq('user_id', user.id);
      if (skills.length > 0) {
        await supabase.from('skills').insert(
          skills.map((s: any) => ({
            user_id: user.id,
            skill_name: typeof s === 'string' ? s : s.skill_name,
            category: typeof s === 'string' ? 'technical' : (s.category || 'technical'),
            proficiency_level: typeof s === 'string' ? 3 : (s.proficiency_level || 3),
          }))
        );
      }
    }

    return NextResponse.json({ success: true, data: { updated: true } });
  } catch (err) {
    console.error('Profile update error:', err);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } }, { status: 500 });
  }
}