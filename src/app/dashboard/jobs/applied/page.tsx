'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Skeleton } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

const STATUS_LABELS: Record<string, { label: string; variant: any }> = {
  saved: { label: 'Saved', variant: 'default' },
  resume_ready: { label: 'Resume ready', variant: 'info' },
  applied: { label: 'Applied', variant: 'info' },
  hr_screen: { label: 'HR screen', variant: 'purple' },
  technical: { label: 'Technical', variant: 'purple' },
  behavioral: { label: 'Behavioral', variant: 'purple' },
  final: { label: 'Final round', variant: 'warning' },
  offer: { label: 'Offer', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  no_response: { label: 'No response', variant: 'default' },
};

export default function AppliedJobsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchApplications();
  }, [user]);

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/applications');
      const json = await res.json();
      if (json.success) setApplications(json.data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    }
    setLoading(false);
  };

  const updateStatus = async (appId: string, newStatus: string) => {
    setUpdatingId(appId);
    try {
      await fetch(`/api/applications`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appId, status: newStatus }),
      });
      await fetchApplications();
    } catch {}
    setUpdatingId(null);
  };

  const appliedApps = applications.filter(a => a.status !== 'saved');
  const filtered = statusFilter ? appliedApps.filter(a => a.status === statusFilter) : appliedApps;

  return (
    <AppShell>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-medium text-slate-900 dark:text-white">
            Applied jobs <Badge variant="info">{filtered.length}</Badge>
          </h1>
          <Select options={[
            { value: '', label: 'All statuses' },
            ...Object.entries(STATUS_LABELS).filter(([k]) => k !== 'saved').map(([k, v]) => ({ value: k, label: v.label })),
          ]} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} />
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4"><Skeleton lines={2} /></div>
          ))}</div>
        ) : filtered.length > 0 ? (
          <div className="space-y-2">
            {filtered.map(app => (
              <div key={app.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{app.job?.title || 'Unknown role'}</p>
                  <p className="text-xs text-slate-500">{app.job?.company_name || 'Unknown'} — Applied {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={STATUS_LABELS[app.status]?.variant || 'default'}>
                    {STATUS_LABELS[app.status]?.label || app.status}
                  </Badge>
                  <Select options={Object.entries(STATUS_LABELS).map(([k, v]) => ({ value: k, label: v.label }))}
                    value={app.status} onChange={e => updateStatus(app.id, e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-12 text-center">
            <p className="text-sm text-slate-500">No applications yet</p>
            <p className="text-xs text-slate-400 mt-1">Apply to jobs from the feed to start tracking your pipeline.</p>
            <Link href="/dashboard/jobs/feed" className="inline-block mt-3"><Button variant="primary" size="sm">Browse jobs</Button></Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
