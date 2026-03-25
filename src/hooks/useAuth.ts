'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { IUser } from '@/types';

// ─── Fetch auth profile via API route ───
async function fetchAuthProfile(): Promise<IUser | null> {
  const supabase = createClient();

  // Single server-validated auth check
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    // Try one refresh if token expired
    const { data: refreshData } = await supabase.auth.refreshSession();
    if (!refreshData?.user) return null;
  }

  // Fetch profile via API (never direct DB)
  const res = await fetch('/api/auth', {
    credentials: 'include',
    headers: { 'Cache-Control': 'no-cache' },
  });

  if (!res.ok) return null;

  const json = await res.json();
  if (json.success && json.data) {
    return json.data as IUser;
  }

  return null;
}

// ─── Cache config per spec ───
const AUTH_STALE_TIME = 5 * 60 * 1000;  // 5 minutes
const AUTH_GC_TIME = 30 * 60 * 1000;    // 30 minutes

export function useAuth(requireAuth = true) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const redirectedRef = useRef(false);

  const {
    data: user,
    isLoading: loading,
    error,
    refetch,
  } = useQuery<IUser | null>({
    queryKey: ['auth', 'me'],
    queryFn: fetchAuthProfile,
    staleTime: AUTH_STALE_TIME,
    gcTime: AUTH_GC_TIME,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // Handle auth redirects
  useEffect(() => {
    if (loading || redirectedRef.current) return;

    if (!user && requireAuth) {
      redirectedRef.current = true;
      router.push('/auth-pages/login');
      return;
    }

    if (user && !user.onboarding_complete && requireAuth) {
      const pathname = window.location.pathname;
      if (!pathname.startsWith('/onboarding')) {
        redirectedRef.current = true;
        router.push('/onboarding/location');
      }
    }
  }, [user, loading, requireAuth, router]);

  // Listen for auth state changes → invalidate cache
  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        queryClient.setQueryData(['auth', 'me'], null);
        if (requireAuth) router.push('/auth-pages/login');
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        redirectedRef.current = false;
        queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient, requireAuth, router]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    queryClient.setQueryData(['auth', 'me'], null);
    router.push('/');
  }, [queryClient, router]);

  const refreshUser = useCallback(() => {
    redirectedRef.current = false;
    queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
  }, [queryClient]);

  return { user: user ?? null, loading, signOut, refreshUser };
}