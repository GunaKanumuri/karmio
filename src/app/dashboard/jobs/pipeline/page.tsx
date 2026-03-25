'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

const PIPELINE_STAGES = [
  { key: 'saved', label: 'Saved', color: 'bg-slate-200 dark:bg-slate-700' },
  { key: 'applied', label: 'Applied', color: 'bg-blue-200 dark:bg-blue-800' },
  { key: 'hr_screen', label: 'HR Screen', color: 'bg-purple-200 dark:bg-purple-800' },
  { key: 'technical', label: 'Technical', color: 'bg-indigo-200 dark:bg-indigo-800' },
  { key: 'behavioral', label: 'Behavioral', color: 'bg-violet-200 dark:bg-violet-800' },
  { key: 'offer', label: 'Offer', color: 'bg-emerald-200 dark:bg-emerald-800' },
];

export default function PipelineBoardPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await fetch('/api/applications');
        const json = await res.json();
        if (json.success) setApplications(json.data || []);
      } catch {}
      setLoading(false);
    })();
  }, [user]);

  const updateStatus = async (appId: string, newStatus: string) => {
    try {
      await fetch('/api/applications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appId, status: newStatus }),
      });
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
    } catch {}
  };

  return (
    <AppShell>
      <div>
        <h1 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Pipeline board</h1>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 min-h-[200px]">
                <Skeleton lines={3} />
              </div>
            ))}
          </div>
        ) : applications.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto">
            {PIPELINE_STAGES.map(stage => {
              const stageApps = applications.filter(a => a.status === stage.key);
              return (
                <div key={stage.key} className="min-w-[180px]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{stage.label}</span>
                    <span className="text-[10px] text-slate-400">{stageApps.length}</span>
                  </div>
                  <div className="space-y-2">
                    {stageApps.map(app => (
                      <div key={app.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-lg p-3">
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{app.job?.title || 'Unknown'}</p>
                        <p className="text-[11px] text-slate-500 truncate">{app.job?.company_name}</p>
                        {app.match_score && (
                          <Badge variant={app.match_score >= 70 ? 'success' : 'default'} className="mt-1">
                            {app.match_score}% match
                          </Badge>
                        )}
                      </div>
                    ))}
                    {stageApps.length === 0 && (
                      <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-4 text-center">
                        <p className="text-[10px] text-slate-400">Empty</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-12 text-center">
            <p className="text-sm text-slate-500">Your pipeline is empty</p>
            <p className="text-xs text-slate-400 mt-1">Start applying to jobs to track your progress through each stage.</p>
            <Link href="/dashboard/jobs/feed" className="inline-block mt-3"><Button variant="primary" size="sm">Browse jobs</Button></Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
