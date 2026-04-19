'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAPI } from './useJobs';

// ─── Contacts ───
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

// ─── Follow-ups ───
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

// ─── Add Contact ───
export function useAddContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      return fetchAPI('/network', { method: 'POST', body: JSON.stringify({ action: 'add_contact', ...data }) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['network', 'contacts'] });
    },
  });
}

// ─── Generate Message ───
export function useGenerateMessage() {
  return useMutation({
    mutationFn: async (data: {
      contact_id: string;
      contact_name: string;
      contact_title: string;
      company: string;
      role: string;
      tone: string;
    }) => {
      return fetchAPI('/network', {
        method: 'POST',
        body: JSON.stringify({ action: 'generate_message', ...data }),
      });
    },
  });
}

// ─── Outreach Suggestions ───
export function useOutreachSuggestions() {
  return useQuery({
    queryKey: ['network', 'outreach'],
    queryFn: async () => {
      const res = await fetchAPI<any[]>('/network/suggest');
      return res.data || [];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useOutreachForApp(applicationId: string | null) {
  return useQuery({
    queryKey: ['network', 'outreach', applicationId],
    queryFn: async () => {
      if (!applicationId) return null;
      const res = await fetchAPI<any>(`/network/suggest?application_id=${applicationId}`);
      return res.data || null;
    },
    enabled: !!applicationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateOutreach() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { application_id: string; job_id: string }) => {
      return fetchAPI('/network/suggest', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['network', 'outreach'] });
    },
  });
}

export function useUpdateOutreach() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; outreach_status: string; notes?: string }) => {
      return fetchAPI('/network/suggest', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['network', 'outreach'] });
      qc.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}

// ─── Complete Follow-up ───
export function useCompleteFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (followUpId: string) => {
      return fetchAPI('/network', {
        method: 'PUT',
        body: JSON.stringify({ follow_up_id: followUpId, is_completed: true }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['network', 'follow-ups'] });
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