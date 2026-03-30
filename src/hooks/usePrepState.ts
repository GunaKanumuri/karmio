'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAPI } from './useJobs';
import { useCallback } from 'react';

export interface PrepStateEntry {
  answer: string;
  confidence: 'not_started' | 'practiced' | 'confident';
  updated_at: string;
}

export type PrepStateMap = Record<string, PrepStateEntry>;

export function usePrepState(userId: string | undefined) {
  const qc = useQueryClient();

  const { data: prepState, isLoading } = useQuery({
    queryKey: ['prep-state', userId],
    queryFn: async (): Promise<PrepStateMap> => {
      if (!userId) return {};
      const res = await fetchAPI<PrepStateMap>('/prep');
      return res.data || {};
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: async (updates: { key: string; answer?: string; confidence?: string }) => {
      return fetchAPI('/prep', {
        method: 'POST',
        body: JSON.stringify(updates),
      });
    },
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: ['prep-state', userId] });
      const prev = qc.getQueryData<PrepStateMap>(['prep-state', userId]);

      qc.setQueryData<PrepStateMap>(['prep-state', userId], (old = {}) => ({
        ...old,
        [updates.key]: {
          answer: updates.answer ?? old[updates.key]?.answer ?? '',
          confidence: (updates.confidence ?? old[updates.key]?.confidence ?? 'not_started') as PrepStateEntry['confidence'],
          updated_at: new Date().toISOString(),
        },
      }));

      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(['prep-state', userId], context.prev);
    },
  });

  const updateAnswer = useCallback((key: string, answer: string) => {
    saveMutation.mutate({ key, answer });
  }, [saveMutation]);

  const updateConfidence = useCallback((key: string, confidence: string) => {
    saveMutation.mutate({ key, confidence });
  }, [saveMutation]);

  return { prepState: prepState || {}, updateAnswer, updateConfidence, isLoading };
}