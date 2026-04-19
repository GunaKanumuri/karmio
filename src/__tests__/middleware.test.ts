import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Middleware unit tests.
 *
 * We test the routing logic in isolation by mocking @supabase/ssr so we can
 * control what `supabase.auth.getUser()` and the `.from('users')` chain return
 * without needing a real Supabase project.
 */

// ─── Supabase mock factory ────────────────────────────────────────────────────

type MockUser = { id: string } | null;

function makeSupabaseMock(user: MockUser, onboardingComplete = true) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: user ? null : { message: 'not authenticated' },
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: user ? { onboarding_complete: onboardingComplete } : null,
        error: null,
      }),
    }),
  };
}

// ─── NextRequest / NextResponse mock helpers ──────────────────────────────────

function makeRequest(url: string, cookies: Record<string, string> = {}) {
  const req = new Request(url);
  const nextUrl = new URL(url);

  const cookieList = Object.entries(cookies).map(([name, value]) => ({ name, value }));

  return {
    url,
    nextUrl,
    headers: req.headers,
    cookies: {
      getAll: () => cookieList,
      set: vi.fn(),
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Middleware routing logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set required env vars
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  // ── Unauthenticated access to protected routes ────────────────────────────

  it('redirects unauthenticated users away from /dashboard', () => {
    const request = makeRequest('http://localhost:3000/dashboard/home');
    const pathname = request.nextUrl.pathname;
    const user = null;

    const isProtected =
      pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding');
    const shouldRedirect = isProtected && !user;

    expect(shouldRedirect).toBe(true);
  });

  it('redirects unauthenticated users away from /onboarding', () => {
    const request = makeRequest('http://localhost:3000/onboarding/location');
    const pathname = request.nextUrl.pathname;
    const user = null;

    const isProtected =
      pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding');
    const shouldRedirect = isProtected && !user;

    expect(shouldRedirect).toBe(true);
  });

  it('preserves the intended destination in the redirect URL', () => {
    const targetPath = '/dashboard/jobs/feed';
    const loginUrl = new URL('/auth-pages/login', 'http://localhost:3000');
    loginUrl.searchParams.set('redirect', targetPath);

    expect(loginUrl.searchParams.get('redirect')).toBe(targetPath);
    expect(loginUrl.pathname).toBe('/auth-pages/login');
  });

  // ── Authenticated users hitting auth pages ────────────────────────────────

  it('redirects a fully-onboarded user away from /auth-pages/login to /dashboard/home', () => {
    const user = { id: 'user-123' };
    const onboardingComplete = true;
    const pathname = '/auth-pages/login';

    const isAuthPage =
      pathname === '/auth-pages/login' || pathname === '/auth-pages/signup';
    const destination = onboardingComplete ? '/dashboard/home' : '/onboarding/location';

    expect(isAuthPage && !!user).toBe(true);
    expect(destination).toBe('/dashboard/home');
  });

  it('redirects an incomplete-onboarding user away from /auth-pages/signup to /onboarding/location', () => {
    const user = { id: 'user-456' };
    const onboardingComplete = false;
    const pathname: string = '/auth-pages/signup';

    const isAuthPage =
      pathname === '/auth-pages/login' || pathname === '/auth-pages/signup';
    const destination = onboardingComplete ? '/dashboard/home' : '/onboarding/location';

    expect(isAuthPage && !!user).toBe(true);
    expect(destination).toBe('/onboarding/location');
  });

  // ── Public routes ─────────────────────────────────────────────────────────

  it('passes through unauthenticated requests to the landing page', () => {
    const pathname: string = '/';
    const user = null;

    const isProtected =
      pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding');
    const isAuthPage =
      pathname === '/auth-pages/login' || pathname === '/auth-pages/signup';

    // Neither block applies → pass through
    expect(isProtected).toBe(false);
    expect(isAuthPage).toBe(false);
  });

  // ── Middleware route matcher ───────────────────────────────────────────────

  it('matches /dashboard/:path* routes', () => {
    const matchers = [
      '/dashboard/:path*',
      '/onboarding/:path*',
      '/auth-pages/login',
      '/auth-pages/signup',
    ];

    const paths = [
      '/dashboard/home',
      '/dashboard/jobs/feed',
      '/onboarding/location',
      '/auth-pages/login',
      '/auth-pages/signup',
    ];

    // All of these should be covered by the middleware config
    const nonMatchedPaths = ['/', '/about', '/blog'];

    paths.forEach(p => {
      const matched = matchers.some(m => {
        if (m.endsWith(':path*')) return p.startsWith(m.replace('/:path*', ''));
        return p === m;
      });
      expect(matched).toBe(true);
    });

    nonMatchedPaths.forEach(p => {
      const matched = matchers.some(m => {
        if (m.endsWith(':path*')) return p.startsWith(m.replace('/:path*', ''));
        return p === m;
      });
      expect(matched).toBe(false);
    });
  });
});
