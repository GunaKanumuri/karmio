import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth errors from provider
  if (error) {
    console.error('[Auth Callback] OAuth error:', { error, errorDescription });
    return NextResponse.redirect(`${origin}/auth-pages/login?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    console.error('[Auth Callback] No code provided');
    return NextResponse.redirect(`${origin}/auth-pages/login?error=no_code`);
  }

  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options as any);
            });
          },
        },
      }
    );

    // Exchange the code for a session
    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('[Auth Callback] Code exchange failed:', exchangeError);
      return NextResponse.redirect(`${origin}/auth-pages/login?error=exchange_failed`);
    }

    if (!sessionData?.user) {
      console.error('[Auth Callback] No user in session data');
      return NextResponse.redirect(`${origin}/auth-pages/login?error=no_user`);
    }

    const user = sessionData.user;

    // Check if user profile exists and get onboarding status
    let { data: profile, error: profileError } = await supabase
      .from('users')
      .select('onboarding_complete')
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
        .select('onboarding_complete')
        .single();

      if (insertError) {
        console.error('[Auth Callback] Profile creation failed:', insertError);
        // Continue anyway - profile will be created on next API call
      }
      profile = newProfile || { onboarding_complete: false };
    }

    // Determine redirect destination based on onboarding status
    const destination = profile?.onboarding_complete 
      ? '/dashboard/home' 
      : '/onboarding/location';

    console.log('[Auth Callback] Success:', { 
      userId: user.id, 
      onboardingComplete: profile?.onboarding_complete,
      destination 
    });

    return NextResponse.redirect(`${origin}${destination}`);
  } catch (err) {
    console.error('[Auth Callback] Unexpected error:', err);
    return NextResponse.redirect(`${origin}/auth-pages/login?error=callback_error`);
  }
}
