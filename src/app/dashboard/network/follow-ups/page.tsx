'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import { Clock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function FollowUpsPage() {
  const { user } = useAuth();
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchFollowUps();
  }, [user]);

  const fetchFollowUps = async () => {
    try {
      // Derive follow-ups from applications that are in 'applied' status and > 7 days old
      const res = await fetch('/api/applications');
      const json = await res.json();
      if (json.success) {
        const apps = json.data || [];
        const fups = apps
          .filter((a: any) => a.status === 'applied' && a.applied_at)
          .map((a: any) => {
            const daysSince = Math.floor((Date.now() - new Date(a.applied_at).getTime()) / 86400000);
            return { ...a, days_since: daysSince, is_overdue: daysSince >= 7 };
          })
          .sort((a: any, b: any) => b.days_since - a.days_since);
        setFollowUps(fups);
      }
    } catch {}
    setLoading(false);
  };

  const markComplete = async (appId: string) => {
    try {
      await fetch('/api/applications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appId, status: 'no_response' }),
      });
      await fetchFollowUps();
    } catch {}
  };

  const overdue = followUps.filter(f => f.is_overdue);
  const upcoming = followUps.filter(f => !f.is_overdue);

  return (
    <AppShell>
      <div className="max-w-4xl">
        <h1 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          Follow-ups {overdue.length > 0 && <Badge variant="warning">{overdue.length} overdue</Badge>}
        </h1>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4"><Skeleton lines={2} /></div>
          ))}</div>
        ) : followUps.length > 0 ? (
          <div className="space-y-4">
            {overdue.length > 0 && (
              <div>
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-2">Overdue (7+ days since application)</p>
                <div className="space-y-2">
                  {overdue.map(f => (
                    <div key={f.id} className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{f.job?.title || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">{f.job?.company_name} — {f.days_since} days ago</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => markComplete(f.id)}>
                        <CheckCircle2 size={14} className="mr-1" /> Mark done
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {upcoming.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Recent applications (follow up after 7 days)</p>
                <div className="space-y-2">
                  {upcoming.map(f => (
                    <div key={f.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{f.job?.title || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">{f.job?.company_name} — applied {f.days_since} day{f.days_since !== 1 ? 's' : ''} ago</p>
                      </div>
                      <Badge>Follow up in {7 - f.days_since} day{7 - f.days_since !== 1 ? 's' : ''}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-12 text-center">
            <Clock size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500">No follow-ups pending</p>
            <p className="text-xs text-slate-400 mt-1">When you apply to jobs, follow-up reminders will appear here after 7 days.</p>
            <Link href="/dashboard/jobs/feed" className="inline-block mt-3"><Button variant="primary" size="sm">Browse jobs</Button></Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
