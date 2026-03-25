'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAPI } from './useJobs';

export function useApplications() {
  return useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const res = await fetchAPI<any[]>('/applications');
      return res.data || [];
    },
    staleTime: 1 * 60 * 1000,    // 1 min
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useUpdateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; status?: string; notes?: string }) => {
      return fetchAPI('/applications', { method: 'PUT', body: JSON.stringify(data) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}

// Backward compat
export async function fetchApplications() {
  const res = await fetchAPI<any[]>('/applications');
  return res.data || [];
}

export async function updateApplicationStatus(id: string, status: string, notes?: string) {
  return fetchAPI('/applications', { method: 'PUT', body: JSON.stringify({ id, status, notes }) });
}
