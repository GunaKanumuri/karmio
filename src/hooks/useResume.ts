'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAPI } from './useJobs';

export function useResumeRecipes() {
  return useQuery({
    queryKey: ['resumes'],
    queryFn: async () => {
      const res = await fetchAPI<any[]>('/resumes');
      return res.data || [];
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });
}

export function useGenerateResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { job_id: string; target_profile_id?: string }) => {
      return fetchAPI('/resumes', { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resumes'] });
    },
  });
}

// Backward compat
export async function generateResume(jobId: string, profileId?: string) {
  return fetchAPI('/resumes', { method: 'POST', body: JSON.stringify({ job_id: jobId, target_profile_id: profileId }) });
}

export async function downloadResume(id: string, format: 'docx' | 'pdf'): Promise<Blob> {
  const res = await fetch(`/api/resumes/${id}/download?format=${format}`);
  return res.blob();
}
