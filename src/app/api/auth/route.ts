import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

// GET /api/auth — Returns current user profile + weekly usage
export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: { code: 'AUTH_NOT_AUTHENTICATED', message: 'Please sign in to continue.' },
      }, { status: 401 });
    }

    let { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*, target_profiles(*)')
      .eq('id', user.id)
      .single();

    // Auto-create profile for first-time OAuth users
    if (profileError || !profile) {
      const { data: newProfile, error: insertError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          onboarding_complete: false,
          country: 'US',
          subscription_tier: 'free',
        }, { onConflict: 'id' })
        .select('*, target_profiles(*)')
        .single();

      if (insertError) {
        return NextResponse.json({
          success: false,
          error: { code: 'PROFILE_CREATE_FAILED', message: 'Could not create profile.' },
        }, { status: 500 });
      }
      profile = newProfile;
    }

    // Weekly usage — graceful if table doesn't exist
    let weeklyUsage = null;
    try {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
      monday.setHours(0, 0, 0, 0);

      const { data: usage } = await supabase
        .from('weekly_usage')
        .select('*')
        .eq('user_id', user.id)
        .gte('week_start', monday.toISOString())
        .single();

      weeklyUsage = usage;
    } catch {
      // Table may not exist yet
    }

    return NextResponse.json({
      success: true,
      data: { ...profile, weekly_usage: weeklyUsage },
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300',
        'X-RateLimit-Limit': '60',
        'X-RateLimit-Remaining': '59',
        'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 60),
      },
    });
  } catch (err) {
    console.error('Auth GET error:', err);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' },
    }, { status: 500 });
  }
}
