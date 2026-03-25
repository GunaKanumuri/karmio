'use client';

import { AppShell } from '@/components/layout/AppShell';
import { Card, MetricCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton, UpgradePrompt } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { fetchAPI } from '@/hooks/useJobs';
import { TIER_LIMITS } from '@/lib/constants';
import { BarChart3, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle2, Lightbulb } from 'lucide-react';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const tier = (user?.subscription_tier || 'free') as keyof typeof TIER_LIMITS;
  const limits = TIER_LIMITS[tier];

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: async () => { const res = await fetchAPI<any>('/analytics?type=overview'); return res.data || null; },
    staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000, refetchOnWindowFocus: true,
  });

  const { data: weekly, isLoading: weeklyLoading } = useQuery({
    queryKey: ['analytics', 'weekly'],
    queryFn: async () => { const res = await fetchAPI<any>('/analytics?type=weekly'); return res.data || null; },
    enabled: limits.has_full_analytics, staleTime: 15 * 60 * 1000, gcTime: 60 * 60 * 1000,
  });

  const { data: funnel } = useQuery({
    queryKey: ['analytics', 'funnel'],
    queryFn: async () => { const res = await fetchAPI<any>('/analytics?type=funnel'); return res.data || null; },
    enabled: limits.has_advanced_analytics, staleTime: 15 * 60 * 1000,
  });

  const { data: insightsData } = useQuery({
    queryKey: ['analytics', 'insights'],
    queryFn: async () => { const res = await fetchAPI<any>('/analytics?type=insights'); return res.data || null; },
    enabled: limits.has_advanced_analytics, staleTime: 15 * 60 * 1000,
  });

  return (
    <AppShell>
      <div className="max-w-4xl">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 size={20} className="text-slate-400" />
          <h1 className="text-lg font-medium text-slate-900 dark:text-white">Analytics</h1>
        </div>

        {overviewLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4"><Skeleton lines={3} /></div>)}</div>
        ) : overview ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <MetricCard label="Total applied" value={overview.total_applied} />
            <MetricCard label="Callback rate" value={overview.total_applied > 0 ? `${overview.callback_rate}%` : '--'} changeType={overview.callback_rate > 20 ? 'up' : 'neutral'} change={overview.callbacks > 0 ? `${overview.callbacks} callbacks` : undefined} />
            <MetricCard label="Offers" value={overview.offers} changeType={overview.offers > 0 ? 'up' : 'neutral'} />
            <MetricCard label="No response" value={overview.no_response} changeType={overview.no_response > 0 ? 'down' : 'neutral'} />
          </div>
        ) : null}

        {/* Funnel */}
        {overview && overview.total_applied > 0 && (
          <Card padding="lg" className="mb-4">
            <p className="text-sm font-medium text-slate-900 dark:text-white mb-4">Application funnel</p>
            <div className="space-y-2.5">
              {[
                { key: 'applied', label: 'Applied', color: 'bg-blue-400' },
                { key: 'hr_screen', label: 'HR Screen', color: 'bg-purple-400' },
                { key: 'technical', label: 'Technical', color: 'bg-indigo-400' },
                { key: 'behavioral', label: 'Behavioral', color: 'bg-violet-400' },
                { key: 'final', label: 'Final Round', color: 'bg-amber-400' },
                { key: 'offer', label: 'Offer', color: 'bg-emerald-400' },
                { key: 'rejected', label: 'Rejected', color: 'bg-red-400' },
                { key: 'no_response', label: 'No Response', color: 'bg-slate-400' },
              ].map(stage => {
                const count = funnel?.funnel?.find((f: any) => f.stage === stage.key)?.count || 0;
                if (count === 0 && !funnel) return null;
                const pct = overview.total_applied > 0 ? Math.max(4, (count / overview.total_applied) * 100) : 0;
                const conversion = funnel?.conversions?.find((c: any) => c.from === stage.key);
                return (
                  <div key={stage.key} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-24 text-right flex-shrink-0">{stage.label}</span>
                    <div className="flex-1 h-7 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${stage.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 w-8 text-right">{count}</span>
                    {conversion && limits.has_advanced_analytics && conversion.rate > 0 && (
                      <span className="text-[10px] text-slate-400 w-12 text-right">→ {conversion.rate}%</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Weekly chart */}
        {limits.has_full_analytics ? (
          <Card padding="lg" className="mb-4">
            <p className="text-sm font-medium text-slate-900 dark:text-white mb-4">Weekly applications (last 8 weeks)</p>
            {weeklyLoading ? <Skeleton lines={4} /> : weekly?.weeks ? (
              <>
                <div className="h-40 flex items-end gap-2 px-2">
                  {weekly.weeks.map((w: any, i: number) => {
                    const maxVal = Math.max(1, ...weekly.weeks.map((wk: any) => wk.applied));
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-slate-500 font-medium">{w.applied}</span>
                        <div className="w-full bg-karmio-400 dark:bg-karmio-600 rounded-t transition-all duration-300 hover:bg-karmio-500"
                          style={{ height: `${Math.max(8, (w.applied / maxVal) * 100)}%` }} title={`${w.label}: ${w.applied} applied`} />
                        <span className="text-[10px] text-slate-400">{w.label}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-karmio-400" />Applications</span>
                  {weekly.weeks.length > 1 && (() => {
                    const latest = weekly.weeks[weekly.weeks.length - 1];
                    const prev = weekly.weeks[weekly.weeks.length - 2];
                    const trend = latest.applied - prev.applied;
                    return (
                      <span className={`flex items-center gap-1 ${trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                        {trend > 0 ? <TrendingUp size={12} /> : trend < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                        {trend > 0 ? `+${trend}` : trend} vs last week
                      </span>
                    );
                  })()}
                </div>
              </>
            ) : <p className="text-xs text-slate-400 text-center py-6">Not enough data yet.</p>}
          </Card>
        ) : <UpgradePrompt feature="Weekly analytics charts" tierNeeded="Popular" />}

        {/* Pro insights */}
        {limits.has_advanced_analytics ? (
          <Card padding="lg" className="mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb size={16} className="text-amber-500" />
              <p className="text-sm font-medium text-slate-900 dark:text-white">AI Insights</p>
              <Badge variant="purple">Pro</Badge>
            </div>
            {insightsData?.insights?.length > 0 ? (
              <div className="space-y-3">
                {insightsData.insights.map((insight: any, i: number) => (
                  <div key={i} className={`flex gap-3 p-3 rounded-xl ${insight.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/10' : insight.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-blue-50 dark:bg-blue-900/10'}`}>
                    {insight.type === 'warning' ? <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" /> : insight.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" /> : <Lightbulb size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />}
                    <p className={`text-xs leading-relaxed ${insight.type === 'warning' ? 'text-amber-700 dark:text-amber-300' : insight.type === 'success' ? 'text-emerald-700 dark:text-emerald-300' : 'text-blue-700 dark:text-blue-300'}`}>{insight.message}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-slate-400 text-center py-4">Apply to more jobs to unlock personalized insights.</p>}
          </Card>
        ) : tier !== 'free' ? <UpgradePrompt feature="AI-powered insights and &quot;Why no callback&quot; analysis" tierNeeded="Pro" /> : null}

        {/* Match score */}
        {overview && overview.avg_match_score > 0 && (
          <Card padding="lg" className="mb-4">
            <p className="text-sm font-medium text-slate-900 dark:text-white mb-3">Match score analysis</p>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <span className="text-lg font-semibold text-slate-700 dark:text-slate-300">{overview.avg_match_score}%</span>
              </div>
              <div>
                <p className="text-sm text-slate-700 dark:text-slate-300">Average match score</p>
                <p className="text-xs text-slate-400 mt-1">
                  {overview.avg_match_score >= 70 ? 'You are applying to well-matched roles. Keep it up.' : overview.avg_match_score >= 50 ? 'Decent match quality. Try to prioritize jobs with 70%+ match scores.' : 'Consider adjusting your target profile to improve match quality.'}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}