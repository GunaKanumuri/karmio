'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import { useApplications } from '@/hooks/useApplications';
import { useTodayJobStats, fetchAPI } from '@/hooks/useJobs';
import { useFollowUps } from '@/hooks/useNetwork';
import { TIER_LIMITS } from '@/lib/constants';
import { SmartCalendar } from '@/components/dashboard/SmartCalendar';
import { DashboardJobCard } from '@/components/dashboard/DashboardJobCard';
import { PipelineTracker } from '@/components/dashboard/PipelineTracker';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { LiveFetchCounter } from '@/components/dashboard/LiveFetchCounter';
import {
  ArrowRight, Search, FileText, Users, Zap,
  Sparkles, Send, Briefcase, Target, Bookmark,
  Clock, TrendingUp, X,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTimeAgo(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 5) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Yesterday' : `${days}d`;
}

function QuickAction({
  href,
  icon,
  label,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 p-2 rounded-lg transition-all hover:bg-slate-50 dark:hover:bg-slate-800/30 group"
    >
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{label}</p>
      <ArrowRight
        size={12}
        className="ml-auto text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </Link>
  );
}

// ─── Dashboard Home Page ──────────────────────────────────────────────────────

export default function DashboardHomePage() {
  const { user } = useAuth();
  const { data: applications = [], isLoading: appsLoading } = useApplications();
  const { data: todayStats, isLoading: jobsLoading } = useTodayJobStats();
  const { data: followUps = [] } = useFollowUps();

  const tier = user?.subscription_tier || 'free';
  const loading = appsLoading || jobsLoading;
  const todayJobs = todayStats?.jobs || [];
  const totalTodayJobs = todayStats?.total_today || 0;
  const weeklyGoal = tier === 'free' ? 5 : 15;

  // Calendar events for the current month
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}-01`;

  const { data: calendarEvents = [], refetch: refetchEvents } = useQuery({
    queryKey: ['calendar', 'events', monthStart],
    queryFn: async () => {
      try {
        const res = await fetchAPI<any[]>(`/calendar?from=${monthStart}&to=${monthEnd}`);
        return res.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 2 * 60 * 1000,
  });

  // Aggregate pipeline stats
  const stats = useMemo(() => {
    const isActive = (status: string) =>
      ['applied', 'hr_screen', 'technical', 'behavioral', 'final', 'offer'].includes(status);
    const isInterview = (status: string) =>
      ['hr_screen', 'technical', 'behavioral', 'final'].includes(status);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    return {
      saved: applications.filter((a: any) => a.status === 'saved').length,
      applied: applications.filter((a: any) => isActive(a.status)).length,
      interviews: applications.filter((a: any) => isInterview(a.status)).length,
      offers: applications.filter((a: any) => a.status === 'offer').length,
      appliedThisWeek: applications.filter((a: any) => {
        const d = new Date(a.applied_at || a.created_at);
        return d >= weekStart && isActive(a.status);
      }).length,
    };
  }, [applications]);

  // Build a map of dates → event types for the calendar
  const eventDatesMap = useMemo(() => {
    const map: Record<string, { types: Set<string>; count: number }> = {};

    followUps
      .filter((f: any) => !f.is_completed)
      .forEach((f: any) => {
        const key = new Date(f.due_date).toDateString();
        if (!map[key]) map[key] = { types: new Set(), count: 0 };
        map[key].types.add('follow_up');
        map[key].count++;
      });

    calendarEvents.forEach((e: any) => {
      const key = new Date(e.event_date).toDateString();
      if (!map[key]) map[key] = { types: new Set(), count: 0 };
      map[key].types.add(e.event_type);
      map[key].count++;
    });

    return map;
  }, [followUps, calendarEvents]);

  // Today's briefing summary
  const briefing = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const parts: string[] = [];

    if (totalTodayJobs > 0) {
      parts.push(`${totalTodayJobs} new jobs match your profile`);
    }

    const followUpsDueToday = followUps.filter(
      (f: any) =>
        !f.is_completed &&
        new Date(f.due_date) >= today &&
        new Date(f.due_date) < tomorrow
    ).length;
    if (followUpsDueToday > 0) {
      parts.push(`${followUpsDueToday} follow-up${followUpsDueToday > 1 ? 's' : ''} due`);
    }

    const interview = calendarEvents.find(
      (e: any) =>
        e.event_type === 'interview' &&
        !e.is_completed &&
        new Date(e.event_date).toDateString() === today.toDateString()
    );
    if (interview) {
      parts.push(`${interview.title}${interview.time_slot ? ` at ${interview.time_slot}` : ''}`);
    }

    return parts;
  }, [totalTodayJobs, followUps, calendarEvents]);

  // Suggest the single best next action
  const nextAction = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueFollowUp = followUps.find(
      (f: any) => !f.is_completed && new Date(f.due_date) < today
    );
    if (overdueFollowUp) {
      const app = applications.find((a: any) => a.id === overdueFollowUp.application_id);
      return {
        label: `Follow up on ${app?.job?.company_name ?? 'application'} (overdue)`,
        href: '/dashboard/network/follow-ups',
        icon: Send,
        color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
      };
    }

    if (stats.applied === 0 && todayJobs.length > 0) {
      return {
        label: `Apply to top match: ${todayJobs[0].title} at ${todayJobs[0].company_name}`,
        href: `/dashboard/jobs/${todayJobs[0].id}`,
        icon: Sparkles,
        color: 'text-karmio-500 bg-karmio-50 dark:bg-karmio-900/20',
      };
    }

    return {
      label: 'Browse new jobs matching your profile',
      href: '/dashboard/jobs/feed',
      icon: Search,
      color: 'text-karmio-500 bg-karmio-50 dark:bg-karmio-900/20',
    };
  }, [followUps, applications, stats, todayJobs]);

  // Recent activity feed
  const recentActivity = useMemo(() => {
    const items: { label: string; time: string; icon: typeof Send; color: string }[] = [];

    applications.slice(0, 4).forEach((app: any) => {
      const company = app.job?.company_name ?? 'Unknown';
      const time = getTimeAgo(new Date(app.applied_at ?? app.created_at));

      if (app.status === 'applied') {
        items.push({ label: `Applied to ${company}`, time, icon: Send, color: 'text-blue-500' });
      } else if (app.status === 'hr_screen') {
        items.push({ label: `Callback from ${company}`, time, icon: Briefcase, color: 'text-emerald-500' });
      } else if (app.status === 'offer') {
        items.push({ label: `Offer from ${company}!`, time, icon: Target, color: 'text-emerald-500' });
      } else if (app.status === 'rejected') {
        items.push({ label: `${company} — rejected`, time, icon: X, color: 'text-red-400' });
      }
    });

    return items.slice(0, 4);
  }, [applications]);

  return (
    <AppShell>
      <div className="max-w-[1400px] mx-auto">

        {/* Today's briefing banner */}
        {!loading && briefing.length > 0 && (
          <div className="mb-4 bg-karmio-50 dark:bg-karmio-900/20 border border-karmio-200 dark:border-karmio-800/50 rounded-xl px-5 py-3 flex gap-3 items-center">
            <Clock size={14} className="text-karmio-500 flex-shrink-0" />
            <p className="text-sm text-karmio-700 dark:text-karmio-300">
              <span className="font-medium">Today:</span> {briefing.join(' · ')}
            </p>
          </div>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">

          {/* ── Left column: Stats → Next Action → Today's Jobs ── */}
          <div className="space-y-4 min-w-0">

            {/* Stats cards */}
            {loading ? (
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 h-[120px]"
                  >
                    <Skeleton lines={3} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {/* Live fetch counter */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 hover:border-slate-300 transition-colors">
                  <LiveFetchCounter />
                </div>

                {/* Weekly applications progress */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-4">
                    <DonutChart value={stats.appliedThisWeek} max={weeklyGoal} />
                    <div>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white">
                        {stats.appliedThisWeek}
                      </p>
                      <p className="text-xs text-slate-500">Applied this week</p>
                      <p className="text-[10px] text-slate-400">
                        {stats.appliedThisWeek >= weeklyGoal
                          ? '🎯 Goal reached!'
                          : `${weeklyGoal - stats.appliedThisWeek} more to go`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Saved + total applied */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 hover:border-slate-300 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
                      <Bookmark size={16} className="text-violet-500" />
                    </div>
                    {stats.interviews > 0 && (
                      <Badge variant="success">
                        {stats.interviews} interview{stats.interviews > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.saved}</p>
                  <p className="text-xs text-slate-500">Saved jobs · {stats.applied} applied total</p>
                </div>
              </div>
            )}

            {/* Next best action */}
            {!loading && (
              <Link
                href={nextAction.href}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 hover:border-karmio-300 transition-all group"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${nextAction.color}`}>
                  <nextAction.icon size={15} />
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-200 flex-1 truncate">
                  {nextAction.label}
                </p>
                <ArrowRight
                  size={14}
                  className="text-slate-300 group-hover:text-karmio-500 transition-colors flex-shrink-0"
                />
              </Link>
            )}

            {/* Today's jobs feed */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-karmio-500" />
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Today&apos;s Jobs</p>
                  <span className="text-[10px] text-slate-400">{totalTodayJobs} fetched</span>
                </div>
                <Link
                  href="/dashboard/jobs/feed"
                  className="text-xs text-karmio-500 hover:text-karmio-600 flex items-center gap-1 font-medium"
                >
                  View all <ArrowRight size={11} />
                </Link>
              </div>

              {jobsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div
                      key={i}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 animate-pulse"
                    >
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800" />
                        <div className="flex-1">
                          <div className="h-4 w-48 bg-slate-100 dark:bg-slate-800 rounded mb-2" />
                          <div className="h-3 w-32 bg-slate-100 dark:bg-slate-800 rounded" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : todayJobs.length > 0 ? (
                <div className="space-y-3">
                  {todayJobs.slice(0, 8).map((job: any) => (
                    <DashboardJobCard key={job.id} job={job} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 p-10 text-center">
                  <Search size={24} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                    No new jobs today yet
                  </p>
                  <p className="text-xs text-slate-400 mb-4">
                    Jobs are fetched every 2 hours from career pages.
                  </p>
                  <Link
                    href="/dashboard/jobs/feed"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-karmio-600 bg-karmio-50 dark:bg-karmio-900/20 rounded-lg hover:bg-karmio-100 transition-colors"
                  >
                    Browse all jobs <ArrowRight size={13} />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* ── Right column: Calendar → Pipeline → Activity → Quick Actions ── */}
          <div className="space-y-4">

            {/* Calendar */}
            <Card padding="lg">
              <SmartCalendar
                eventDatesMap={eventDatesMap}
                calendarEvents={calendarEvents}
                followUps={followUps}
                applications={applications}
                onEventAdded={refetchEvents}
              />
            </Card>

            {/* Pipeline tracker */}
            <Card padding="lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Briefcase size={14} className="text-indigo-500" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Pipeline
                  </p>
                </div>
                <Link
                  href="/dashboard/jobs/pipeline"
                  className="text-xs text-karmio-500 hover:text-karmio-600 flex items-center gap-1 font-medium"
                >
                  View <ArrowRight size={11} />
                </Link>
              </div>
              <PipelineTracker
                saved={stats.saved}
                applied={stats.applied}
                interviews={stats.interviews}
                offers={stats.offers}
              />
            </Card>

            {/* Recent activity */}
            {recentActivity.length > 0 && (
              <Card padding="lg">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2.5 uppercase tracking-wider">
                  Recent
                </p>
                {recentActivity.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 py-2 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                  >
                    <item.icon size={12} className={item.color} />
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 flex-1 truncate">
                      {item.label}
                    </p>
                    <span className="text-[9px] text-slate-400 flex-shrink-0">{item.time}</span>
                  </div>
                ))}
              </Card>
            )}

            {/* Quick actions */}
            <Card padding="lg">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2.5 uppercase tracking-wider">
                Quick Actions
              </p>
              <div className="space-y-0.5">
                <QuickAction
                  href="/dashboard/jobs/feed"
                  icon={<Search size={14} />}
                  label="Browse jobs"
                  color="bg-blue-50 dark:bg-blue-900/20 text-blue-500"
                />
                <QuickAction
                  href="/dashboard/resumes"
                  icon={<FileText size={14} />}
                  label="My resumes"
                  color="bg-violet-50 dark:bg-violet-900/20 text-violet-500"
                />
                <QuickAction
                  href="/dashboard/network/contacts"
                  icon={<Users size={14} />}
                  label="Networking"
                  color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500"
                />
                <QuickAction
                  href="/dashboard/analytics"
                  icon={<TrendingUp size={14} />}
                  label="Analytics"
                  color="bg-amber-50 dark:bg-amber-900/20 text-amber-500"
                />
              </div>
            </Card>

            {/* Upgrade nudge for free tier */}
            {tier === 'free' && (
              <Link
                href="/dashboard/subscription"
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 hover:border-karmio-300 hover:text-karmio-600 transition-all text-xs group"
              >
                <Zap size={13} className="group-hover:text-karmio-500" />
                <span>Upgrade for unlimited applications</span>
                <ArrowRight
                  size={11}
                  className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </Link>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
