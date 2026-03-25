'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Bookmark, ExternalLink, Trash2 } from 'lucide-react';

export default function SavedJobsPage() {
  const { user } = useAuth();
  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchSaved();
  }, [user]);

  const fetchSaved = async () => {
    try {
      const res = await fetch('/api/applications');
      const json = await res.json();
      if (json.success) {
        setSavedJobs((json.data || []).filter((a: any) => a.status === 'saved'));
      }
    } catch {}
    setLoading(false);
  };

  const removeSaved = async (appId: string) => {
    try {
      await fetch('/api/applications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appId, _delete: true }),
      });
      setSavedJobs(prev => prev.filter(j => j.id !== appId));
    } catch {}
  };

  return (
    <AppShell>
      <div className="max-w-4xl">
        <h1 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          Saved jobs <Badge variant="info">{savedJobs.length}</Badge>
        </h1>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4"><Skeleton lines={2} /></div>
          ))}</div>
        ) : savedJobs.length > 0 ? (
          <div className="space-y-2">
            {savedJobs.map(app => (
              <div key={app.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Bookmark size={16} className="text-karmio-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{app.job?.title || 'Unknown role'}</p>
                    <p className="text-xs text-slate-500">{app.job?.company_name} — {app.job?.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {app.job?.source_url && (
                    <a href={app.job.source_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost"><ExternalLink size={14} /></Button>
                    </a>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => removeSaved(app.id)}>
                    <Trash2 size={14} className="text-red-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-12 text-center">
            <Bookmark size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500">No saved jobs yet</p>
            <p className="text-xs text-slate-400 mt-1">Save jobs from the feed to review them later.</p>
            <Link href="/dashboard/jobs/feed" className="inline-block mt-3"><Button variant="primary" size="sm">Browse jobs</Button></Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
