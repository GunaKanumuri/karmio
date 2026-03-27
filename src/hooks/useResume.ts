'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAPI } from './useJobs';
import { IResumeRecipe } from '@/types/resume';

// All saved resume recipes
export function useResumeRecipes() {
  return useQuery({
    queryKey: ['resumes'],
    queryFn: async () => {
      const res = await fetchAPI<IResumeRecipe[]>('/resumes');
      return res.data || [];
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });
}

// Get a specific recipe
export function useResumeRecipe(recipeId: string | null) {
  return useQuery({
    queryKey: ['resume', recipeId],
    queryFn: async () => {
      if (!recipeId) return null;
      const res = await fetchAPI<IResumeRecipe>(`/resumes?id=${recipeId}`);
      return res.data || null;
    },
    enabled: !!recipeId,
    staleTime: 30 * 60 * 1000,
  });
}

// Check if a recipe exists for a job
export function useResumeForJob(jobId: string | null) {
  return useQuery({
    queryKey: ['resume-for-job', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const res = await fetchAPI<IResumeRecipe>(`/resumes?job_id=${jobId}`);
      return res.data || null;
    },
    enabled: !!jobId,
    staleTime: 10 * 60 * 1000,
  });
}

// Generate a tailored resume (POST /api/resumes)
export function useGenerateResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      job_id: string;
      target_profile_id?: string;
      selected_project_ids?: string[];
      action?: 'generate' | 'cover_letter';
    }) => {
      return fetchAPI<IResumeRecipe>('/resumes', {
        method: 'POST',
        body: JSON.stringify({ ...data, action: data.action || 'generate' }),
      });
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['resumes'] });
      qc.invalidateQueries({ queryKey: ['resume-for-job', variables.job_id] });
    },
  });
}

// Generate cover letter for an existing recipe
export function useGenerateCoverLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { job_id: string }) => {
      return fetchAPI<IResumeRecipe>('/resumes', {
        method: 'POST',
        body: JSON.stringify({ ...data, action: 'cover_letter' }),
      });
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['resumes'] });
      qc.invalidateQueries({ queryKey: ['resume-for-job', variables.job_id] });
    },
  });
}

// Download a resume
export async function downloadResume(recipeId: string, format: 'docx' | 'pdf'): Promise<Blob> {
  const res = await fetch(`/api/resumes/${recipeId}/download?format=${format}`);
  if (!res.ok) throw new Error('Download failed');
  return res.blob();
}

// Trigger download in browser
export async function triggerDownload(recipeId: string, format: 'docx' | 'pdf', filename?: string) {
  const blob = await downloadResume(recipeId, format);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `resume.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Backward compat
export async function generateResume(jobId: string, profileId?: string) {
  return fetchAPI('/resumes', {
    method: 'POST',
    body: JSON.stringify({ job_id: jobId, target_profile_id: profileId, action: 'generate' }),
  });
}