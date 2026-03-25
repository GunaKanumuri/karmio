'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { MetricCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton, UpgradePrompt } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import { BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
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

  const tier = user?.subscription_tier || 'free';
  const applied = applications.filter(a => a.status !== 'saved');
  const totalApplied = applied.length;

  const statusCounts: Record<string, number> = {};
  applied.forEach(a => { statusCounts[a.status] = (statusCounts[a.status] || 0) + 1; });

  const callbacks = applied.filter(a => ['hr_screen', 'technical', 'behavioral', 'final', 'offer'].includes(a.status)).length;
  const callbackRate = totalApplied > 0 ? Math.round((callbacks / totalApplied) * 100) : 0;
  const offers = statusCounts['offer'] || 0;
  const rejected = statusCounts['rejected'] || 0;
  const noResponse = statusCounts['no_response'] || 0;

  // Weekly breakdown
  const weeks: { label: string; count: number }[] = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (i * 7 + weekStart.getDay()));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const count = applied.filter(a => {
      if (!a.applied_at) return false;
      const d = new Date(a.applied_at);
      return d >= weekStart && d < weekEnd;
    }).length;
    weeks.push({
      label: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count,
    });
  }
  const maxWeekly = Math.max(1, ...weeks.map(w => w.count));

  return (
    <AppShell>
      <div className="max-w-4xl">
        <h1 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Analytics</h1>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4"><Skeleton lines={3} /></div>
            ))}
          </div>
        ) : (
          <>
            {/* Overview metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <MetricCard label="Total applied" value={totalApplied} />
              <MetricCard label="Callback rate" value={totalApplied > 0 ? `${callbackRate}%` : '--'} changeType={callbackRate > 20 ? 'up' : 'neutral'} change={callbacks > 0 ? `${callbacks} callbacks` : 'No callbacks yet'} />
              <MetricCard label="Offers" value={offers} changeType={offers > 0 ? 'up' : 'neutral'} />
              <MetricCard label="No response" value={noResponse} changeType={noResponse > 0 ? 'down' : 'neutral'} />
            </div>

            {/* Status breakdown */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 mb-4">
              <p className="text-sm font-medium text-slate-900 dark:text-white mb-4">Application funnel</p>
              {totalApplied > 0 ? (
                <div className="space-y-2">
                  {[
                    { key: 'applied', label: 'Applied', color: 'bg-blue-400' },
                    { key: 'hr_screen', label: 'HR Screen', color: 'bg-purple-400' },
                    { key: 'technical', label: 'Technical', color: 'bg-indigo-400' },
                    { key: 'behavioral', label: 'Behavioral', color: 'bg-violet-400' },
                    { key: 'final', label: 'Final Round', color: 'bg-amber-400' },
                    { key: 'offer', label: 'Offer', color: 'bg-emerald-400' },
                    { key: 'rejected', label: 'Rejected', color: 'bg-red-400' },
                    { key: 'no_response', label: 'No Response', color: 'bg-slate-400' },
                  ].filter(s => statusCounts[s.key]).map(stage => (
                    <div key={stage.key} className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 w-24 text-right">{stage.label}</span>
                      <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${stage.color} rounded-full transition-all`}
                          style={{ width: `${Math.max(4, ((statusCounts[stage.key] || 0) / totalApplied) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 w-8">{statusCounts[stage.key] || 0}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">Apply to jobs to see your funnel breakdown.</p>
              )}
            </div>

            {/* Weekly chart */}
            {tier !== 'free' ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 mb-4">
                <p className="text-sm font-medium text-slate-900 dark:text-white mb-4">Weekly applications (last 4 weeks)</p>
                <div className="h-32 flex items-end gap-3 px-4">
                  {weeks.map((w, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-slate-500 font-medium">{w.count}</span>
                      <div className="w-full bg-karmio-400 dark:bg-karmio-600 rounded-t transition-all"
                        style={{ height: `${Math.max(8, (w.count / maxWeekly) * 100)}%` }} />
                      <span className="text-[10px] text-slate-400">{w.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <UpgradePrompt feature="Weekly analytics charts" tierNeeded="Popular" />
            )}

            {/* Pro insights */}
            {tier === 'pro' ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5">
                <p className="text-sm font-medium text-slate-900 dark:text-white mb-3">Insights</p>
                {totalApplied > 5 ? (
                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                    {callbackRate < 15 && <p>Your callback rate is below average. Consider tailoring resumes more closely to job requirements.</p>}
                    {noResponse > totalApplied * 0.5 && <p>Over half your applications got no response. Try following up after 7 days.</p>}
                    {offers > 0 && <p>You have {offers} offer{offers > 1 ? 's' : ''}. Review salary data before negotiating.</p>}
                    {callbackRate >= 15 && <p>Your callback rate is solid. Keep applying consistently.</p>}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Apply to more jobs to unlock personalized insights.</p>
                )}
              </div>
            ) : tier === 'free' ? null : (
              <UpgradePrompt feature="AI-powered insights and &quot;Why no callback&quot; analysis" tierNeeded="Pro" />
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
