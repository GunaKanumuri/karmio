'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAPI } from './useJobs';

export function useContacts() {
  return useQuery({
    queryKey: ['network', 'contacts'],
    queryFn: async () => {
      const res = await fetchAPI<any[]>('/network?type=contacts');
      return res.data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useFollowUps() {
  return useQuery({
    queryKey: ['network', 'follow-ups'],
    queryFn: async () => {
      const res = await fetchAPI<any[]>('/network?type=follow-ups');
      return res.data || [];
    },
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useAddContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      return fetchAPI('/network', { method: 'POST', body: JSON.stringify({ type: 'contact', ...data }) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['network', 'contacts'] });
    },
  });
}

export function useGenerateMessage() {
  return useMutation({
    mutationFn: async (data: { contact_name: string; contact_title: string; company: string; role: string; tone: string }) => {
      return fetchAPI('/network', { method: 'POST', body: JSON.stringify({ type: 'message', ...data }) });
    },
  });
}

// Backward compat
export async function fetchContacts() {
  const res = await fetchAPI<any[]>('/network?type=contacts');
  return res.data || [];
}

export async function fetchFollowUps() {
  const res = await fetchAPI<any[]>('/network?type=follow-ups');
  return res.data || [];
}
