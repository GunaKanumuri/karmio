'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAPI } from './useJobs';

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const res = await fetchAPI<any>('/subscription/status');
      return res.data || null;
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

// Backward compat
export async function fetchSubscriptionStatus() {
  return fetchAPI<any>('/subscription/status');
}

export async function createCheckoutSession(plan: 'popular' | 'pro', billing: 'monthly' | 'yearly') {
  return fetchAPI('/subscription/checkout', { method: 'POST', body: JSON.stringify({ plan, billing }) });
}

export async function cancelSubscription() {
  return fetchAPI('/subscription/cancel', { method: 'POST' });
}
