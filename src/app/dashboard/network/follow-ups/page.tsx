'use client';

import { useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import { useFollowUps } from '@/hooks/useNetwork';
import { fetchAPI } from '@/hooks/useJobs';
import { useQueryClient } from '@tanstack/react-query';
import { Clock, CheckCircle2, AlertTriangle, Bell, Calendar } from 'lucide-react';

export default function FollowUpsPage() {
  const { user } = useAuth();
  const { data: followUps = [], isLoading } = useFollowUps();
  const queryClient = useQueryClient();
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleComplete = async (id: string) => {
    setCompletingId(id);
    try {
      const res = await fetchAPI('/network', { method: 'PUT', body: JSON.stringify({ type: 'follow-up', id, is_completed: true }) });
      if ((res as any).success) { showToast('Follow-up marked as complete'); queryClient.invalidateQueries({ queryKey: ['network', 'follow-ups'] }); }
      else { showToast('Failed to update follow-up'); }
    } catch { showToast('Network error'); }
    setCompletingId(null);
  };

  const { overdue, today, upcoming, completed } = useMemo(() => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setDate(todayEnd.getDate() + 1);
    const overdue: any[] = [], today: any[] = [], upcoming: any[] = [], completed: any[] = [];
    followUps.forEach((f: any) => {
      if (f.is_completed) { completed.push(f); return; }
      const due = new Date(f.due_date);
      if (due < now) overdue.push(f);
      else if (due < todayEnd) today.push(f);
      else upcoming.push(f);
    });
    overdue.sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    upcoming.sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    completed.sort((a: any, b: any) => new Date(b.completed_at || b.due_date).getTime() - new Date(a.completed_at || a.due_date).getTime());
    return { overdue, today, upcoming, completed };
  }, [followUps]);

  const pendingCount = overdue.length + today.length + upcoming.length;

  return (
    <AppShell>
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-medium text-slate-900 dark:text-white flex items-center gap-2">
              <Bell size={20} className="text-slate-400" /> Follow-ups
              {pendingCount > 0 && <Badge variant="warning">{pendingCount} pending</Badge>}
            </h1>
            <p className="text-xs text-slate-500 mt-1">Stay on top of your outreach. Follow up at the right time to increase callbacks.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Card key={i}><Skeleton lines={3} /></Card>)}</div>
        ) : pendingCount === 0 && completed.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <Bell size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">No follow-ups yet</p>
              <p className="text-xs text-slate-400">When you apply to jobs, Karmio automatically creates follow-up reminders at Day 3, 7, 14, and 21.</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {overdue.length > 0 && <FollowUpSection title="Overdue" icon={<AlertTriangle size={16} className="text-red-500" />} badge={<Badge variant="danger">{overdue.length}</Badge>} items={overdue} completingId={completingId} onComplete={handleComplete} urgencyClass="border-l-4 border-l-red-400" />}
            {today.length > 0 && <FollowUpSection title="Due today" icon={<Clock size={16} className="text-amber-500" />} badge={<Badge variant="warning">{today.length}</Badge>} items={today} completingId={completingId} onComplete={handleComplete} urgencyClass="border-l-4 border-l-amber-400" />}
            {upcoming.length > 0 && <FollowUpSection title="Upcoming" icon={<Calendar size={16} className="text-blue-500" />} badge={<Badge variant="info">{upcoming.length}</Badge>} items={upcoming} completingId={completingId} onComplete={handleComplete} urgencyClass="" />}
            {completed.length > 0 && (
              <div>
                <button onClick={() => setShowCompleted(!showCompleted)} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center gap-1">
                  <CheckCircle2 size={14} /> {showCompleted ? 'Hide' : 'Show'} {completed.length} completed
                </button>
                {showCompleted && (
                  <div className="mt-3 space-y-2">
                    {completed.slice(0, 10).map((f: any) => (
                      <div key={f.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl opacity-60">
                        <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-500 line-through">Day {f.day_number} {f.type} follow-up</p>
                          <p className="text-[10px] text-slate-400">Completed {f.completed_at ? new Date(f.completed_at).toLocaleDateString() : ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {toast && <div className="fixed bottom-6 right-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg z-50 animate-fade-in">{toast}</div>}
      </div>
    </AppShell>
  );
}

function FollowUpSection({ title, icon, badge, items, completingId, onComplete, urgencyClass }: {
  title: string; icon: React.ReactNode; badge: React.ReactNode; items: any[]; completingId: string | null; onComplete: (id: string) => void; urgencyClass: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">{icon}<p className="text-sm font-medium text-slate-900 dark:text-white">{title}</p>{badge}</div>
      <div className="space-y-2">
        {items.map((f: any) => {
          const due = new Date(f.due_date);
          const daysAgo = Math.floor((Date.now() - due.getTime()) / (1000 * 60 * 60 * 24));
          return (
            <div key={f.id} className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 ${urgencyClass}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={f.type === 'recruiter' ? 'purple' : f.type === 'networking' ? 'info' : 'default'}>{f.type}</Badge>
                    <span className="text-xs text-slate-400">Day {f.day_number}</span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {f.type === 'recruiter' ? `Follow up with recruiter (${f.day_number} day${f.day_number > 1 ? 's' : ''} after application)` : f.type === 'networking' ? 'Check in with your contact' : 'General follow-up on your application'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Due: {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {daysAgo > 0 && ` · ${daysAgo} day${daysAgo > 1 ? 's' : ''} overdue`}
                  </p>
                </div>
                <Button variant="success" size="sm" onClick={() => onComplete(f.id)} loading={completingId === f.id}>
                  <CheckCircle2 size={14} /> Done
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}