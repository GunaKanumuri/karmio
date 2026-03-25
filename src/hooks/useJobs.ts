'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IJobCardData, IJobFilters, IApiResponse } from '@/types';

// ─── Shared fetch helper ───
export async function fetchAPI<T>(endpoint: string, options?: RequestInit & { params?: Record<string, any> }): Promise<IApiResponse<T>> {
  const url = new URL(`/api${endpoint}`, window.location.origin);
  if (options?.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      if (Array.isArray(value)) value.forEach(v => url.searchParams.append(key, v));
      else if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    });
  }
  const res = await fetch(url.toString(), { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } });
  return res.json();
}

// ─── Job Feed (React Query) ───
export function useJobFeed(filters: IJobFilters) {
  return useQuery({
    queryKey: ['jobs', 'feed', filters],
    queryFn: async () => {
      const res = await fetchAPI<IJobCardData[]>('/jobs', { params: filters as any });
      return res.data || [];
    },
    staleTime: 2 * 60 * 1000,       // 2 min
    gcTime: 10 * 60 * 1000,          // 10 min gc
    refetchOnWindowFocus: true,
    refetchInterval: 2 * 60 * 1000,  // poll every 2 min
  });
}

// ─── Today's matches ───
export function useTodayMatches() {
  return useQuery({
    queryKey: ['jobs', 'today'],
    queryFn: async () => {
      const res = await fetchAPI<IJobCardData[]>('/jobs', { params: { posted_within: '1d', sort_by: 'match', limit: '5' } });
      return res.data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

// ─── Mutations ───
export function useSaveJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      return fetchAPI('/applications', { method: 'POST', body: JSON.stringify({ job_id: jobId, status: 'saved' }) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}

export function useApplyToJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { job_id: string; match_score?: number }) => {
      return fetchAPI('/applications', { method: 'POST', body: JSON.stringify({ ...data, status: 'applied' }) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}

// Backward compat exports
export async function fetchJobs(filters: IJobFilters): Promise<IJobCardData[]> {
  const res = await fetchAPI<IJobCardData[]>('/jobs', { params: filters as any });
  return res.data || [];
}

export async function createApplication(data: { job_id: string; target_profile_id?: string; match_score?: number; status?: string }) {
  return fetchAPI('/applications', { method: 'POST', body: JSON.stringify(data) });
}
