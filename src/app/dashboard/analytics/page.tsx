'use client';

import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton, UpgradePrompt } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { fetchAPI } from '@/hooks/useJobs';
import { TIER_LIMITS } from '@/lib/constants';
import {
  BarChart3, TrendingUp, TrendingDown, Minus, AlertCircle,
  CheckCircle2, Lightbulb, ArrowRight, Users, Clock,
  Target, Zap, Send, MessageSquare, Calendar,
} from 'lucide-react';
import Link from 'next/link';

const CALLBACK_STAGES = ['hr_screen', 'technical', 'behavioral', 'final', 'offer'];

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

  const { data: funnelData } = useQuery({
    queryKey: ['analytics', 'funnel'],
    queryFn: async () => { const res = await fetchAPI<any>('/analytics?type=funnel'); return res.data || null; },
    staleTime: 15 * 60 * 1000,
  });

  const { data: insightsData } = useQuery({
    queryKey: ['analytics', 'insights'],
    queryFn: async () => { const res = await fetchAPI<any>('/analytics?type=insights'); return res.data || null; },
    enabled: limits.has_advanced_analytics, staleTime: 15 * 60 * 1000,
  });

  const hasData = overview && overview.total_applied > 0;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 size={20} className="text-slate-400" />
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Analytics</h1>
        </div>

        {overviewLoading ? (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/50 p-6">
              <Skeleton lines={4} />
            </div>
          </div>
        ) : !hasData ? (
          /* ─── Empty State ─── */
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-karmio-50 dark:bg-karmio-900/20 flex items-center justify-center">
              <BarChart3 size={28} className="text-karmio-400" />
            </div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-white mb-2">
              Start applying to unlock analytics
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
              Once you apply to jobs, you will see your callback rate, application velocity,
              funnel breakdown, and outreach effectiveness here.
            </p>
            <Link href="/dashboard/jobs/feed">
              <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-karmio-500 text-white text-sm font-medium hover:bg-karmio-600 transition-colors">
                Browse jobs <ArrowRight size={14} />
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {/* ─── Section 1: Job Search Health ─── */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-slate-800 dark:text-white">Job search health</p>
                {overview.days_since_last_app >= 0 && (
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    overview.days_since_last_app <= 2
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : overview.days_since_last_app <= 7
                      ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {overview.days_since_last_app === 0
                      ? 'Applied today'
                      : overview.days_since_last_app === 1
                      ? 'Last applied yesterday'
                      : `${overview.days_since_last_app}d since last app`}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Total Applied */}
                <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{overview.total_applied}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Total applied</p>
                </div>

                {/* Callback Rate Gauge */}
                <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="relative w-14 h-14 mx-auto mb-1">
                    <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor"
                        className="text-slate-200 dark:text-slate-700" strokeWidth="3" />
                      <circle cx="18" cy="18" r="14" fill="none"
                        className={overview.callback_rate >= 20 ? 'text-emerald-400' : overview.callback_rate >= 10 ? 'text-amber-400' : 'text-red-400'}
                        strokeWidth="3" strokeDasharray={`${overview.callback_rate * 0.88} 88`}
                        strokeLinecap="round" stroke="currentColor" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-800 dark:text-white">
                      {overview.callback_rate}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">Callback rate</p>
                </div>

                {/* Offers */}
                <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <p className={`text-2xl font-bold ${overview.offers > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                    {overview.offers}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Offers</p>
                </div>

                {/* No Response */}
                <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <p className={`text-2xl font-bold ${overview.no_response > overview.total_applied * 0.5 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                    {overview.no_response}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">No response</p>
                </div>
              </div>

              {/* This week progress bar */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-500">This week</span>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {overview.this_week_apps} applied
                  </span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-karmio-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (overview.this_week_apps / 5) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* ─── Section 2: Application Velocity (FREE — last 4 weeks mini chart) ─── */}
            {overview.velocity && overview.velocity.some((v: number) => v > 0) && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                    <Zap size={14} className="text-karmio-400" />
                    Application velocity
                  </p>
                  <VelocityTrend velocity={overview.velocity} />
                </div>

                <div className="h-24 flex items-end gap-3 px-1">
                  {overview.velocity.map((count: number, i: number) => {
                    const maxVal = Math.max(1, ...overview.velocity);
                    const labels = ['3w ago', '2w ago', 'Last wk', 'This wk'];
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-slate-500 font-medium">{count}</span>
                        <div
                          className={`w-full rounded-t-md transition-all duration-500 ${
                            i === 3 ? 'bg-karmio-400 dark:bg-karmio-500' : 'bg-slate-200 dark:bg-slate-700'
                          }`}
                          style={{ height: `${Math.max(6, (count / maxVal) * 100)}%` }}
                        />
                        <span className="text-[9px] text-slate-400">{labels[i]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── Section 3: Application Funnel (basic for all, conversion rates Pro) ─── */}
            {funnelData && funnelData.total > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5">
                <p className="text-sm font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <Target size={14} className="text-slate-400" />
                  Application funnel
                </p>

                <div className="space-y-2.5">
                  {[
                    { key: 'applied', label: 'Applied', color: 'bg-blue-400', dot: 'bg-blue-400' },
                    { key: 'hr_screen', label: 'HR Screen', color: 'bg-purple-400', dot: 'bg-purple-400' },
                    { key: 'technical', label: 'Technical', color: 'bg-indigo-400', dot: 'bg-indigo-400' },
                    { key: 'behavioral', label: 'Behavioral', color: 'bg-violet-400', dot: 'bg-violet-400' },
                    { key: 'final', label: 'Final Round', color: 'bg-amber-400', dot: 'bg-amber-400' },
                    { key: 'offer', label: 'Offer', color: 'bg-emerald-400', dot: 'bg-emerald-400' },
                    { key: 'rejected', label: 'Rejected', color: 'bg-red-300', dot: 'bg-red-400' },
                    { key: 'no_response', label: 'No Response', color: 'bg-slate-300', dot: 'bg-slate-400' },
                  ].map(stage => {
                    const count = funnelData.funnel?.find((f: any) => f.stage === stage.key)?.count || 0;
                    if (count === 0) return null;
                    const pct = funnelData.total > 0 ? Math.max(4, (count / funnelData.total) * 100) : 0;
                    const conversion = funnelData.conversions?.find((c: any) => c.from === stage.key);
                    const avgDays = funnelData.avg_days_per_stage?.[stage.key];

                    return (
                      <div key={stage.key} className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-500 w-24 text-right flex-shrink-0 flex items-center justify-end gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
                          {stage.label}
                        </span>
                        <div className="flex-1 h-7 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full ${stage.color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-6 text-right">{count}</span>
                        {/* Pro: conversion rate */}
                        {limits.has_advanced_analytics && conversion && conversion.rate > 0 && (
                          <span className="text-[10px] text-slate-400 w-10 text-right">→{conversion.rate}%</span>
                        )}
                        {/* Pro: avg days */}
                        {limits.has_advanced_analytics && avgDays !== undefined && avgDays > 0 && (
                          <span className="text-[10px] text-slate-400 w-10 text-right flex items-center gap-0.5">
                            <Clock size={8} />{avgDays}d
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!limits.has_advanced_analytics && (
                  <p className="text-[10px] text-slate-400 mt-3 text-center">
                    Upgrade to Pro to see conversion rates and average time per stage.
                  </p>
                )}
              </div>
            )}

            {/* ─── Section 4: Outreach Effectiveness (FREE) ─── */}
            {overview.outreach && (overview.outreach.sent > 0 || overview.outreach.with_outreach_total > 0) && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5">
                <p className="text-sm font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <Users size={14} className="text-blue-400" />
                  Outreach effectiveness
                </p>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10">
                    <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{overview.outreach.sent}</p>
                    <p className="text-[10px] text-blue-600 dark:text-blue-400">Messages sent</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10">
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{overview.outreach.responded}</p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Responses</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-purple-50 dark:bg-purple-900/10">
                    <p className="text-lg font-bold text-purple-700 dark:text-purple-300">{overview.outreach.response_rate}%</p>
                    <p className="text-[10px] text-purple-600 dark:text-purple-400">Response rate</p>
                  </div>
                </div>

                {/* Callback comparison: with vs without outreach */}
                {overview.outreach.with_outreach_total > 0 && overview.outreach.without_outreach_total > 0 && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Networking impact on callbacks</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Send size={8} /> With outreach
                          </span>
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            {overview.outreach.with_outreach_total > 0
                              ? Math.round((overview.outreach.with_outreach_callbacks / overview.outreach.with_outreach_total) * 100)
                              : 0}% callback
                          </span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-400 rounded-full" style={{
                            width: `${overview.outreach.with_outreach_total > 0
                              ? Math.max(4, (overview.outreach.with_outreach_callbacks / overview.outreach.with_outreach_total) * 100)
                              : 0}%`
                          }} />
                        </div>
                      </div>
                      <span className="text-slate-300 text-xs">vs</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-slate-500">Without</span>
                          <span className="text-xs font-semibold text-slate-500">
                            {overview.outreach.without_outreach_total > 0
                              ? Math.round((overview.outreach.without_outreach_callbacks / overview.outreach.without_outreach_total) * 100)
                              : 0}% callback
                          </span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-400 rounded-full" style={{
                            width: `${overview.outreach.without_outreach_total > 0
                              ? Math.max(4, (overview.outreach.without_outreach_callbacks / overview.outreach.without_outreach_total) * 100)
                              : 0}%`
                          }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── Section 4b: Follow-up Reminder ─── */}
            {overview.follow_ups && (overview.follow_ups.overdue > 0 || overview.follow_ups.upcoming > 0) && (
              <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900">
                <Calendar size={16} className="text-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {overview.follow_ups.overdue > 0 ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      <span className="font-semibold">{overview.follow_ups.overdue} overdue</span> follow-up{overview.follow_ups.overdue > 1 ? 's' : ''}.
                      {overview.follow_ups.upcoming > 0 && ` ${overview.follow_ups.upcoming} upcoming.`}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">
                      {overview.follow_ups.upcoming} upcoming follow-up{overview.follow_ups.upcoming > 1 ? 's' : ''}.
                    </p>
                  )}
                </div>
                <Link href="/dashboard/network/follow-ups" className="text-xs text-karmio-500 hover:text-karmio-600 font-medium flex-shrink-0">
                  View
                </Link>
              </div>
            )}

            {/* ─── Section 5a: Weekly Chart (Popular+) ─── */}
            {limits.has_full_analytics ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5">
                <p className="text-sm font-semibold text-slate-800 dark:text-white mb-4">
                  Weekly applications (last 8 weeks)
                </p>
                {weeklyLoading ? <Skeleton lines={4} /> : weekly?.weeks ? (
                  <>
                    <div className="h-40 flex items-end gap-2 px-2">
                      {weekly.weeks.map((w: any, i: number) => {
                        const maxVal = Math.max(1, ...weekly.weeks.map((wk: any) => wk.applied));
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                            <span className="text-[10px] text-slate-500 font-medium">{w.applied}</span>
                            <div className="w-full relative">
                              <div
                                className="w-full bg-karmio-400 dark:bg-karmio-500 rounded-t-md transition-all duration-300 group-hover:bg-karmio-500"
                                style={{ height: `${Math.max(8, (w.applied / maxVal) * 128)}px` }}
                              />
                              {w.callbacks > 0 && (
                                <div
                                  className="w-full bg-emerald-400 dark:bg-emerald-500 rounded-t-md absolute bottom-0 left-0 opacity-60"
                                  style={{ height: `${Math.max(4, (w.callbacks / maxVal) * 128)}px` }}
                                />
                              )}
                            </div>
                            <span className="text-[9px] text-slate-400">{w.label}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-karmio-400" />Applied</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />Callbacks</span>
                      {weekly.weeks.length > 1 && (() => {
                        const latest = weekly.weeks[weekly.weeks.length - 1];
                        const prev = weekly.weeks[weekly.weeks.length - 2];
                        const trend = latest.applied - prev.applied;
                        return (
                          <span className={`flex items-center gap-1 ml-auto ${trend > 0 ? 'text-emerald-500' : trend < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                            {trend > 0 ? <TrendingUp size={10} /> : trend < 0 ? <TrendingDown size={10} /> : <Minus size={10} />}
                            {trend > 0 ? `+${trend}` : trend} vs last week
                          </span>
                        );
                      })()}
                    </div>
                  </>
                ) : <p className="text-xs text-slate-400 text-center py-6">Not enough data yet.</p>}
              </div>
            ) : (
              <UpgradePrompt feature="Weekly analytics charts" tierNeeded="Popular" />
            )}

            {/* ─── Section 5b: Match Score Analysis (FREE) ─── */}
            {overview.avg_match_score > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5">
                <p className="text-sm font-semibold text-slate-800 dark:text-white mb-3">Match score analysis</p>
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor"
                        className="text-slate-200 dark:text-slate-700" strokeWidth="2.5" />
                      <circle cx="18" cy="18" r="14" fill="none"
                        className={overview.avg_match_score >= 70 ? 'text-emerald-400' : overview.avg_match_score >= 50 ? 'text-karmio-400' : 'text-amber-400'}
                        strokeWidth="2.5" strokeDasharray={`${overview.avg_match_score * 0.88} 88`}
                        strokeLinecap="round" stroke="currentColor" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-800 dark:text-white">
                      {overview.avg_match_score}%
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Average match score</p>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {overview.avg_match_score >= 70
                        ? 'You are applying to well-matched roles. Keep it up.'
                        : overview.avg_match_score >= 50
                        ? 'Decent match quality. Prioritize jobs with 70%+ match for better callbacks.'
                        : 'Consider adjusting your target profile to improve match quality.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Section 5c: AI Insights (Pro) ─── */}
            {limits.has_advanced_analytics ? (
              insightsData?.insights?.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Lightbulb size={14} className="text-amber-400" />
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">AI Insights</p>
                    <Badge variant="purple">Pro</Badge>
                  </div>
                  <div className="space-y-2.5">
                    {insightsData.insights.map((insight: any, i: number) => (
                      <div key={i} className={`flex gap-3 p-3.5 rounded-xl ${
                        insight.type === 'warning'
                          ? 'bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30'
                          : insight.type === 'success'
                          ? 'bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200/50 dark:border-emerald-800/30'
                          : 'bg-blue-50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/30'
                      }`}>
                        {insight.type === 'warning' ? <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                          : insight.type === 'success' ? <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                          : <Lightbulb size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />}
                        <div>
                          {insight.title && (
                            <p className={`text-xs font-semibold mb-0.5 ${
                              insight.type === 'warning' ? 'text-amber-700 dark:text-amber-300'
                                : insight.type === 'success' ? 'text-emerald-700 dark:text-emerald-300'
                                : 'text-blue-700 dark:text-blue-300'
                            }`}>{insight.title}</p>
                          )}
                          <p className={`text-xs leading-relaxed ${
                            insight.type === 'warning' ? 'text-amber-600 dark:text-amber-400'
                              : insight.type === 'success' ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-blue-600 dark:text-blue-400'
                          }`}>{insight.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ) : tier !== 'free' ? (
              <UpgradePrompt feature="AI-powered insights and 'Why no callback' analysis" tierNeeded="Pro" />
            ) : null}
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ─── Velocity Trend Indicator ───
function VelocityTrend({ velocity }: { velocity: number[] }) {
  if (velocity.length < 2) return null;
  const current = velocity[velocity.length - 1];
  const previous = velocity[velocity.length - 2];
  const diff = current - previous;

  if (diff === 0) return (
    <span className="text-[10px] text-slate-400 flex items-center gap-1">
      <Minus size={10} /> Same as last week
    </span>
  );

  return (
    <span className={`text-[10px] flex items-center gap-1 ${diff > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
      {diff > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {diff > 0 ? `+${diff}` : diff} vs last week
    </span>
  );
}