'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge, MatchRing } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import { useApplications } from '@/hooks/useApplications';
import { useTodayJobStats, fetchAPI } from '@/hooks/useJobs';
import { useFollowUps } from '@/hooks/useNetwork';
import { analyzeGhostJob, getGhostLabel, getGhostColor } from '@/lib/jobs/ghost-detector';
import { TIER_LIMITS } from '@/lib/constants';
import { IJobCardData } from '@/types';
import {
  ArrowRight, Search, FileText, Users, Zap,
  Sparkles, BookmarkCheck, Send, TrendingUp,
  Briefcase, ChevronLeft, ChevronRight, Target,
  Bookmark, ExternalLink, Clock, CalendarPlus,
  Plus, X, Check, Calendar, AlertCircle,
  MessageSquare, ExternalLink as ExtLink,
} from 'lucide-react';
import { LiveFetchCounter } from '@/components/dashboard/LiveFetchCounter';

// ─── Event config ───
const EVENT_TYPES = [
  { key: 'interview', label: 'Interview', dot: 'bg-blue-500', icon: Briefcase, lightBg: 'bg-blue-50 dark:bg-blue-900/20' },
  { key: 'assessment', label: 'Assessment', dot: 'bg-indigo-500', icon: FileText, lightBg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  { key: 'deadline', label: 'Deadline', dot: 'bg-red-500', icon: AlertCircle, lightBg: 'bg-red-50 dark:bg-red-900/20' },
  { key: 'todo', label: 'To-do', dot: 'bg-amber-500', icon: Check, lightBg: 'bg-amber-50 dark:bg-amber-900/20' },
  { key: 'prep', label: 'Prep', dot: 'bg-violet-500', icon: Target, lightBg: 'bg-violet-50 dark:bg-violet-900/20' },
  { key: 'follow_up', label: 'Follow-up', dot: 'bg-emerald-500', icon: Send, lightBg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { key: 'other', label: 'Other', dot: 'bg-slate-500', icon: Calendar, lightBg: 'bg-slate-50 dark:bg-slate-800/50' },
] as const;

function getEventConfig(type: string) {
  return EVENT_TYPES.find(e => e.key === type) || EVENT_TYPES[EVENT_TYPES.length - 1];
}

function buildGcalUrl(title: string, date: string, time?: string): string {
  const d = date.replace(/-/g, '');
  const t = time ? time.replace(':', '') + '00' : '090000';
  const end = time ? String(Number(time.split(':')[0]) + 1).padStart(2, '0') + time.split(':')[1] + '00' : '100000';
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${d}T${t}/${d}T${end}&details=${encodeURIComponent('Added from Karmio')}`;
}

export default function DashboardHomePage() {
  const { user } = useAuth();
  const { data: applications = [], isLoading: appsLoading } = useApplications();
  const { data: todayStats, isLoading: jobsLoading } = useTodayJobStats();
  const { data: followUps = [], isLoading: followUpsLoading } = useFollowUps();
  const router = useRouter();

  const tier = user?.subscription_tier || 'free';
  const loading = appsLoading || jobsLoading;
  const todayJobs = todayStats?.jobs || [];
  const totalTodayJobs = todayStats?.total_today || 0;

  // Calendar events
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}-01`;

  const { data: calendarEvents = [], refetch: refetchEvents } = useQuery({
    queryKey: ['calendar', 'events', monthStart],
    queryFn: async () => { try { const res = await fetchAPI<any[]>(`/calendar?from=${monthStart}&to=${monthEnd}`); return res.data || []; } catch { return []; } },
    staleTime: 2 * 60 * 1000,
  });

  // Stats
  const stats = useMemo(() => {
    const saved = applications.filter((a: any) => a.status === 'saved').length;
    const applied = applications.filter((a: any) => ['applied', 'hr_screen', 'technical', 'behavioral', 'final', 'offer'].includes(a.status)).length;
    const interviews = applications.filter((a: any) => ['hr_screen', 'technical', 'behavioral', 'final'].includes(a.status)).length;
    const offers = applications.filter((a: any) => a.status === 'offer').length;
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0, 0, 0, 0);
    const appliedThisWeek = applications.filter((a: any) => {
      const d = new Date(a.applied_at || a.created_at);
      return d >= weekStart && ['applied', 'hr_screen', 'technical', 'behavioral', 'final', 'offer'].includes(a.status);
    }).length;
    return { saved, applied, interviews, offers, appliedThisWeek };
  }, [applications]);

  // Event dates map
  const eventDatesMap = useMemo(() => {
    const map: Record<string, { types: Set<string>; count: number }> = {};
    followUps.filter((f: any) => !f.is_completed).forEach((f: any) => {
      const key = new Date(f.due_date).toDateString();
      if (!map[key]) map[key] = { types: new Set(), count: 0 }; map[key].types.add('follow_up'); map[key].count++;
    });
    calendarEvents.forEach((e: any) => {
      const key = new Date(e.event_date).toDateString();
      if (!map[key]) map[key] = { types: new Set(), count: 0 }; map[key].types.add(e.event_type); map[key].count++;
    });
    return map;
  }, [followUps, calendarEvents]);

  // Briefing
  const briefing = useMemo(() => {
    const parts: string[] = [];
    if (totalTodayJobs > 0) parts.push(`${totalTodayJobs} new jobs match your profile`);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const fDue = followUps.filter((f: any) => !f.is_completed && new Date(f.due_date) >= today && new Date(f.due_date) < tomorrow).length;
    if (fDue > 0) parts.push(`${fDue} follow-up${fDue > 1 ? 's' : ''} due`);
    const intv = calendarEvents.find((e: any) => e.event_type === 'interview' && !e.is_completed && new Date(e.event_date).toDateString() === today.toDateString());
    if (intv) parts.push(`${intv.title}${intv.time_slot ? ` at ${intv.time_slot}` : ''}`);
    return parts;
  }, [totalTodayJobs, followUps, calendarEvents]);

  // Next action
  const nextAction = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const overdue = followUps.filter((f: any) => !f.is_completed && new Date(f.due_date) < today);
    if (overdue.length > 0) {
      const app = applications.find((a: any) => a.id === overdue[0].application_id);
      return { label: `Follow up on ${app?.job?.company_name || 'application'} (overdue)`, href: '/dashboard/network/follow-ups', icon: Send, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' };
    }
    if (stats.applied === 0 && todayJobs.length > 0)
      return { label: `Apply to top match: ${todayJobs[0].title} at ${todayJobs[0].company_name}`, href: `/dashboard/jobs/${todayJobs[0].id}`, icon: Sparkles, color: 'text-karmio-500 bg-karmio-50 dark:bg-karmio-900/20' };
    return { label: 'Browse new jobs matching your profile', href: '/dashboard/jobs/feed', icon: Search, color: 'text-karmio-500 bg-karmio-50 dark:bg-karmio-900/20' };
  }, [followUps, applications, stats, todayJobs]);

  // Recent activity
  const recentActivity = useMemo(() => {
    const items: { label: string; time: string; icon: typeof Send; color: string }[] = [];
    applications.slice(0, 4).forEach((app: any) => {
      const c = app.job?.company_name || 'Unknown';
      const t = getTimeAgo(new Date(app.applied_at || app.created_at));
      if (app.status === 'applied') items.push({ label: `Applied to ${c}`, time: t, icon: Send, color: 'text-blue-500' });
      else if (app.status === 'hr_screen') items.push({ label: `Callback from ${c}`, time: t, icon: Briefcase, color: 'text-emerald-500' });
      else if (app.status === 'offer') items.push({ label: `Offer from ${c}!`, time: t, icon: Target, color: 'text-emerald-500' });
      else if (app.status === 'rejected') items.push({ label: `${c} — rejected`, time: t, icon: X, color: 'text-red-400' });
    });
    return items.slice(0, 4);
  }, [applications]);

  const weeklyGoal = tier === 'free' ? 5 : 15;

  return (
    <AppShell>
      <div className="max-w-[1400px] mx-auto">

        {/* Briefing */}
        {!loading && briefing.length > 0 && (
          <div className="mb-4 bg-karmio-50 dark:bg-karmio-900/20 border border-karmio-200 dark:border-karmio-800/50 rounded-xl px-5 py-3 flex gap-3 items-center">
            <Clock size={14} className="text-karmio-500 flex-shrink-0" />
            <p className="text-sm text-karmio-700 dark:text-karmio-300"><span className="font-medium">Today:</span> {briefing.join(' · ')}</p>
          </div>
        )}

        {/* ══ SINGLE GRID — everything side by side from the top ══ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">

          {/* ═══ LEFT COLUMN: Stats → Action → Jobs ═══ */}
          <div className="space-y-4 min-w-0">

            {/* Stats Row */}
            {loading ? (
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map(i => <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 h-[120px]"><Skeleton lines={3} /></div>)}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 hover:border-slate-300 transition-colors">
                  <LiveFetchCounter />
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-4">
                    <DonutChart value={stats.appliedThisWeek} max={weeklyGoal} />
                    <div>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.appliedThisWeek}</p>
                      <p className="text-xs text-slate-500">Applied this week</p>
                      <p className="text-[10px] text-slate-400">{stats.appliedThisWeek >= weeklyGoal ? '🎯 Goal reached!' : `${weeklyGoal - stats.appliedThisWeek} more to go`}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 hover:border-slate-300 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center"><Bookmark size={16} className="text-violet-500" /></div>
                    {stats.interviews > 0 && <Badge variant="success">{stats.interviews} interview{stats.interviews > 1 ? 's' : ''}</Badge>}
                  </div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.saved}</p>
                  <p className="text-xs text-slate-500">Saved jobs · {stats.applied} applied total</p>
                </div>
              </div>
            )}

            {/* Next Best Action */}
            {!loading && (
              <Link href={nextAction.href} className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 hover:border-karmio-300 transition-all group">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${nextAction.color}`}><nextAction.icon size={15} /></div>
                <p className="text-sm text-slate-700 dark:text-slate-200 flex-1 truncate">{nextAction.label}</p>
                <ArrowRight size={14} className="text-slate-300 group-hover:text-karmio-500 transition-colors flex-shrink-0" />
              </Link>
            )}

            {/* Today's Jobs */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-karmio-500" />
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Today&apos;s Jobs</p>
                  <span className="text-[10px] text-slate-400">{totalTodayJobs} fetched</span>
                </div>
                <Link href="/dashboard/jobs/feed" className="text-xs text-karmio-500 hover:text-karmio-600 flex items-center gap-1 font-medium">View all <ArrowRight size={11} /></Link>
              </div>

              {jobsLoading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 animate-pulse"><div className="flex gap-3"><div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800" /><div className="flex-1"><div className="h-4 w-48 bg-slate-100 dark:bg-slate-800 rounded mb-2" /><div className="h-3 w-32 bg-slate-100 dark:bg-slate-800 rounded" /></div></div></div>)}</div>
              ) : todayJobs.length > 0 ? (
                <div className="space-y-3">{todayJobs.slice(0, 8).map((job: any) => <DashboardJobCard key={job.id} job={job} />)}</div>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 p-10 text-center">
                  <Search size={24} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">No new jobs today yet</p>
                  <p className="text-xs text-slate-400 mb-4">Jobs are fetched every 2 hours from career pages.</p>
                  <Link href="/dashboard/jobs/feed" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-karmio-600 bg-karmio-50 dark:bg-karmio-900/20 rounded-lg hover:bg-karmio-100 transition-colors">Browse all jobs <ArrowRight size={13} /></Link>
                </div>
              )}
            </div>
          </div>

          {/* ═══ RIGHT COLUMN: Calendar → Pipeline → Activity → Quick Actions ═══ */}
          <div className="space-y-4">
            <Card padding="lg">
              <SmartCalendar eventDatesMap={eventDatesMap} calendarEvents={calendarEvents} followUps={followUps} applications={applications} onEventAdded={refetchEvents} />
            </Card>

            <Card padding="lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><Briefcase size={14} className="text-indigo-500" /><p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Pipeline</p></div>
                <Link href="/dashboard/jobs/pipeline" className="text-xs text-karmio-500 hover:text-karmio-600 flex items-center gap-1 font-medium">View <ArrowRight size={11} /></Link>
              </div>
              <PipelineTracker saved={stats.saved} applied={stats.applied} interviews={stats.interviews} offers={stats.offers} />
            </Card>

            {recentActivity.length > 0 && (
              <Card padding="lg">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2.5 uppercase tracking-wider">Recent</p>
                {recentActivity.map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-2 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                    <item.icon size={12} className={item.color} />
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 flex-1 truncate">{item.label}</p>
                    <span className="text-[9px] text-slate-400 flex-shrink-0">{item.time}</span>
                  </div>
                ))}
              </Card>
            )}

            <Card padding="lg">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2.5 uppercase tracking-wider">Quick Actions</p>
              <div className="space-y-0.5">
                <QuickAction href="/dashboard/jobs/feed" icon={<Search size={14} />} label="Browse jobs" color="bg-blue-50 dark:bg-blue-900/20 text-blue-500" />
                <QuickAction href="/dashboard/resumes" icon={<FileText size={14} />} label="My resumes" color="bg-violet-50 dark:bg-violet-900/20 text-violet-500" />
                <QuickAction href="/dashboard/network/contacts" icon={<Users size={14} />} label="Networking" color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500" />
                <QuickAction href="/dashboard/analytics" icon={<TrendingUp size={14} />} label="Analytics" color="bg-amber-50 dark:bg-amber-900/20 text-amber-500" />
              </div>
            </Card>

            {tier === 'free' && (
              <Link href="/dashboard/subscription" className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 hover:border-karmio-300 hover:text-karmio-600 transition-all text-xs group">
                <Zap size={13} className="group-hover:text-karmio-500" /><span>Upgrade for unlimited applications</span>
                <ArrowRight size={11} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SMART CALENDAR with "Add to Google Calendar" + clear CTA
// ═══════════════════════════════════════════════════════════════

function SmartCalendar({ eventDatesMap, calendarEvents, followUps, applications, onEventAdded }: {
  eventDatesMap: Record<string, { types: Set<string>; count: number }>;
  calendarEvents: any[]; followUps: any[]; applications: any[]; onEventAdded: () => void;
}) {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAddModal, setShowAddModal] = useState(false);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const year = viewDate.getFullYear(); const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = selectedDate.toISOString().slice(0, 10);
    const items: any[] = [];
    calendarEvents.forEach((e: any) => {
      if (e.event_date === dateStr) items.push({ id: e.id, type: e.event_type, title: e.title, time: e.time_slot, source: 'calendar', completed: e.is_completed, date: e.event_date });
    });
    followUps.filter((f: any) => !f.is_completed).forEach((f: any) => {
      if (new Date(f.due_date).toISOString().slice(0, 10) === dateStr) {
        const app = applications.find((a: any) => a.id === f.application_id);
        items.push({ id: f.id, type: 'follow_up', title: `Follow up: ${app?.job?.company_name || 'Application'}`, source: 'follow_up', completed: false, date: dateStr });
      }
    });
    return items;
  }, [selectedDate, calendarEvents, followUps, applications]);

  const hasAnyEvents = Object.keys(eventDatesMap).length > 0;

  return (
    <div>
      {/* Header with subtitle */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{monthName}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Click a date to view or add events</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="w-6 h-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"><ChevronLeft size={13} className="text-slate-400" /></button>
          <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="w-6 h-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"><ChevronRight size={13} className="text-slate-400" /></button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-0.5">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d} className="text-center text-[9px] font-medium text-slate-400 py-0.5">{d}</div>)}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = new Date(year, month, day);
          const isToday = date.toDateString() === today.toDateString();
          const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
          const dateEvents = eventDatesMap[date.toDateString()];
          const isPast = date < today && !isToday;

          const dots: string[] = [];
          if (dateEvents) ['interview', 'deadline', 'follow_up', 'todo', 'assessment', 'prep'].forEach(t => {
            if (dateEvents.types.has(t) && dots.length < 3) dots.push(getEventConfig(t).dot);
          });

          return (
            <button key={day} onClick={() => setSelectedDate(date)}
              className={`relative text-center py-1.5 rounded-lg text-[11px] transition-all ${
                isSelected && !isToday ? 'bg-karmio-100 dark:bg-karmio-900/40 text-karmio-700 dark:text-karmio-300 ring-1 ring-karmio-300 font-bold'
                : isToday ? 'bg-karmio-500 text-white font-bold'
                : dateEvents ? 'font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                : isPast ? 'text-slate-300 dark:text-slate-600'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}>
              {day}
              {dots.length > 0 && !isToday && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-px">
                  {dots.map((c, di) => <div key={di} className={`w-1 h-1 rounded-full ${c}`} />)}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        {['interview', 'follow_up', 'deadline', 'todo'].map(t => {
          const cfg = getEventConfig(t);
          return <span key={t} className="flex items-center gap-1 text-[8px] text-slate-400"><span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}</span>;
        })}
      </div>

      {/* Selected date panel — ALWAYS visible */}
      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-karmio-600 bg-karmio-50 dark:bg-karmio-900/20 hover:bg-karmio-100 transition-colors">
            <Plus size={10} /> Add event
          </button>
        </div>

        {selectedDateEvents.length === 0 ? (
          <div className="text-center py-4">
            <CalendarPlus size={18} className="mx-auto mb-1.5 text-slate-300" />
            <p className="text-[10px] text-slate-400">No events scheduled.</p>
            <p className="text-[9px] text-slate-400 mt-0.5">Add interviews, deadlines, or to-dos.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {selectedDateEvents.map((evt: any) => {
              const cfg = getEventConfig(evt.type);
              const Icon = cfg.icon;
              return (
                <div key={evt.id} className={`flex items-center gap-2 p-2 rounded-lg ${cfg.lightBg}`}>
                  <Icon size={12} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-medium truncate ${evt.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>{evt.title}</p>
                    {evt.time && <p className="text-[9px] text-slate-400">{evt.time}</p>}
                  </div>
                  {/* Add to Google Calendar */}
                  <a href={buildGcalUrl(evt.title, evt.date, evt.time)} target="_blank" rel="noopener noreferrer"
                    className="flex-shrink-0 p-1 rounded hover:bg-white/50 dark:hover:bg-slate-700/50 transition-colors" title="Add to Google Calendar">
                    <ExternalLink size={10} className="text-slate-400 hover:text-blue-500" />
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAddModal && selectedDate && (
        <AddEventModal date={selectedDate} applications={applications} onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); onEventAdded(); }} />
      )}
    </div>
  );
}

// ─── Add Event Modal ───
function AddEventModal({ date, applications, onClose, onSaved }: {
  date: Date; applications: any[]; onClose: () => void; onSaved: () => void;
}) {
  const [eventType, setEventType] = useState('interview');
  const [title, setTitle] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [appId, setAppId] = useState('');
  const [saving, setSaving] = useState(false);
  const activeApps = applications.filter((a: any) => ['applied', 'hr_screen', 'technical', 'behavioral', 'final'].includes(a.status));

  const handleSave = async () => {
    if (!title.trim()) return; setSaving(true);
    try {
      const app = activeApps.find((a: any) => a.id === appId);
      await fetch('/api/calendar', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_date: date.toISOString().slice(0, 10), event_type: eventType, title: title.trim(), time_slot: timeSlot || null, notes: notes || null, application_id: appId || null, company_name: app?.job?.company_name || null }),
      });
      onSaved();
    } catch { setSaving(false); }
  };

  return (
    <Modal open={true} onClose={onClose} title="Add event" size="sm">
      <div className="space-y-3">
        <p className="text-xs text-slate-500">{date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Type</label>
          <div className="flex flex-wrap gap-1.5">
            {EVENT_TYPES.filter(t => t.key !== 'other').map(t => (
              <button key={t.key} onClick={() => setEventType(t.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${eventType === t.key ? 'bg-karmio-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}>{t.label}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Technical interview with..." className="input-field text-sm" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Time <span className="font-normal text-slate-400">(opt.)</span></label>
            <input type="time" value={timeSlot} onChange={e => setTimeSlot(e.target.value)} className="input-field text-sm" /></div>
          {activeApps.length > 0 && (
            <div><label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Application <span className="font-normal text-slate-400">(opt.)</span></label>
              <select value={appId} onChange={e => setAppId(e.target.value)} className="input-field text-sm"><option value="">None</option>{activeApps.map((a: any) => <option key={a.id} value={a.id}>{a.job?.company_name}</option>)}</select></div>
          )}
        </div>
        <div><label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Notes <span className="font-normal text-slate-400">(opt.)</span></label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Details, links..." className="input-field text-sm min-h-[50px] resize-none" /></div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={!title.trim() || saving} className="btn btn-primary flex-1 disabled:opacity-50">{saving ? 'Saving...' : 'Add event'}</button>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════

function DonutChart({ value, max }: { value: number; max: number }) {
  const size = 64; const sw = 6; const r = (size - sw) / 2; const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1); const offset = circ - pct * circ;
  const color = pct >= 1 ? '#10B981' : pct >= 0.6 ? '#8B5CF6' : '#3B82F6';
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={sw} className="stroke-slate-100 dark:stroke-slate-800" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center"><span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{value}/{max}</span></div>
    </div>
  );
}

function DashboardJobCard({ job }: { job: IJobCardData }) {
  const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false); const router = useRouter();
  const ghostAnalysis = analyzeGhostJob(job); const ghostLabel = getGhostLabel(ghostAnalysis);
  const logoUrl = `https://logo.clearbit.com/${job.company_name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
  const ci = job.company_name.charAt(0).toUpperCase();
  const handleSave = async () => { if (saved||saving) return; setSaving(true); try { const r = await fetch('/api/applications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({job_id:job.id,status:'saved'})}); const j=await r.json(); if(j.success)setSaved(true); } catch{} setSaving(false); };
  const handleApply = () => { if(job.source_url)window.open(job.source_url,'_blank'); else if(job.ats_board_url)window.open(job.ats_board_url,'_blank'); };
  const h = Math.floor((Date.now()-new Date(job.first_seen_at).getTime())/3600000);
  const tl = h<1?'Just now':h<24?`${h}h ago`:`${Math.floor(h/24)}d ago`;

  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 transition-all group">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
          <img src={logoUrl} alt="" className="w-full h-full object-contain p-1" onError={(e)=>{(e.target as HTMLImageElement).style.display='none';(e.target as HTMLImageElement).parentElement!.innerHTML=`<span class="text-xs font-bold text-slate-400">${ci}</span>`;}} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight group-hover:text-karmio-600 cursor-pointer truncate" onClick={()=>router.push(`/dashboard/jobs/${job.id}`)}>{job.title}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">{job.company_name} · {job.location}{job.remote_type==='remote'&&<span className="text-emerald-500 ml-1">(Remote)</span>}</p>
            </div>
            {(job as any).match_score>0&&<MatchRing score={(job as any).match_score} size={32}/>}
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {ghostLabel!=='Verified'&&<Badge variant={ghostAnalysis.ghostScore>=50?'warning':'default'}>{ghostLabel}</Badge>}
            <span className="text-[9px] text-slate-400">{tl}</span>
            {job.salary_min&&job.salary_max&&<span className="text-[9px] text-slate-500">${Math.round(job.salary_min/1000)}k–${Math.round(job.salary_max/1000)}k</span>}
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
            <button onClick={handleSave} disabled={saved||saving} className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium border transition-all ${saved?'bg-emerald-50 border-emerald-200 text-emerald-600':'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'}`}><Bookmark size={11} className={saved?'fill-current':''}/>{saved?'Saved':'Save'}</button>
            <button onClick={()=>router.push(`/dashboard/resumes/builder?job=${job.id}`)} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium border border-karmio-200 dark:border-karmio-800 text-karmio-600 hover:bg-karmio-50 transition-all"><FileText size={11}/>Tailor</button>
            <button onClick={handleApply} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium bg-karmio-500 text-white hover:bg-karmio-600 transition-all ml-auto"><ExternalLink size={11}/>Apply</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PipelineTracker({saved,applied,interviews,offers}:{saved:number;applied:number;interviews:number;offers:number}) {
  const stages=[{label:'Saved',count:saved,color:'bg-blue-500',ring:'ring-blue-200 dark:ring-blue-800',icon:<BookmarkCheck size={11}/>},{label:'Applied',count:applied,color:'bg-violet-500',ring:'ring-violet-200 dark:ring-violet-800',icon:<Send size={11}/>},{label:'Interviews',count:interviews,color:'bg-amber-500',ring:'ring-amber-200 dark:ring-amber-800',icon:<Briefcase size={11}/>},{label:'Offers',count:offers,color:'bg-emerald-500',ring:'ring-emerald-200 dark:ring-emerald-800',icon:<Target size={11}/>}];
  const total=saved+applied+interviews+offers;
  const text=total===0?'Start saving jobs!':offers>0?'🎉 Offers!':interviews>0?'🔥 Interviews in progress':applied>0?'💪 Keep applying':'📌 Start applying!';
  return (<div>{stages.map((s,i)=>(<div key={s.label} className="flex items-center gap-2.5 relative">{i<stages.length-1&&<div className="absolute left-[12px] top-[24px] w-[2px] h-[16px] bg-slate-200 dark:bg-slate-700"/>}<div className={`w-6 h-6 rounded-full ${s.count>0?s.color:'bg-slate-200 dark:bg-slate-700'} flex items-center justify-center text-white flex-shrink-0 ${s.count>0?`ring-2 ${s.ring}`:''}`}>{s.icon}</div><div className="flex-1 flex items-center justify-between py-2"><span className={`text-[11px] ${s.count>0?'font-medium text-slate-700 dark:text-slate-300':'text-slate-400'}`}>{s.label}</span><span className={`text-sm font-bold ${s.count>0?'text-slate-900 dark:text-white':'text-slate-300 dark:text-slate-600'}`}>{s.count}</span></div></div>))}<p className="text-[10px] text-slate-400 text-center italic mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">{text}</p></div>);
}

function QuickAction({href,icon,label,color}:{href:string;icon:React.ReactNode;label:string;color:string}) {
  return (<Link href={href} className="flex items-center gap-2.5 p-2 rounded-lg transition-all hover:bg-slate-50 dark:hover:bg-slate-800/30 group"><div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>{icon}</div><p className="text-xs font-medium text-slate-700 dark:text-slate-200">{label}</p><ArrowRight size={12} className="ml-auto text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"/></Link>);
}

function getTimeAgo(date:Date):string{const m=Math.floor((Date.now()-date.getTime())/60000);if(m<5)return'Just now';if(m<60)return`${m}m`;const h=Math.floor(m/60);if(h<24)return`${h}h`;const d=Math.floor(h/24);return d===1?'Yesterday':`${d}d`;}