import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as any)
          );
        },
      },
    }
  );

  // Server-validated auth — no cached JWT, no DB queries
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protected routes — require login
  if ((pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) && (!user || authError)) {
    const loginUrl = new URL('/auth-pages/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Logged-in users hitting login/signup — send to dashboard
  // NOTE: Onboarding check happens in useAuth hook, NOT here (zero DB queries in middleware)
  if (user && !authError && (pathname === '/auth-pages/login' || pathname === '/auth-pages/signup')) {
    return NextResponse.redirect(new URL('/dashboard/home', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/auth-pages/login', '/auth-pages/signup'],
};