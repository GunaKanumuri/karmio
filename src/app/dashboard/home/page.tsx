'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge, MatchRing } from '@/components/ui/Badge';
import { Skeleton } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import { useApplications } from '@/hooks/useApplications';
import { useTodayJobStats } from '@/hooks/useJobs';
import { useFollowUps } from '@/hooks/useNetwork';
import { analyzeGhostJob, getGhostLabel, getGhostColor } from '@/lib/jobs/ghost-detector';
import { TIER_LIMITS } from '@/lib/constants';
import { IJobCardData } from '@/types';
import {
  ArrowRight, Search, FileText, Users, Zap,
  Sparkles, BookmarkCheck, Send, TrendingUp,
  Briefcase, ChevronLeft, ChevronRight, Target,
  ArrowUpRight, Bookmark, ExternalLink
} from 'lucide-react';

export default function DashboardHomePage() {
  const { user } = useAuth();
  const { data: applications = [], isLoading: appsLoading } = useApplications();
  const { data: todayStats, isLoading: jobsLoading } = useTodayJobStats();
  const { data: followUps = [], isLoading: followUpsLoading } = useFollowUps();
  const router = useRouter();

  const tier = user?.subscription_tier || 'free';
  const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS];
  const loading = appsLoading || jobsLoading;

  const todayJobs = todayStats?.jobs || [];
  const totalTodayJobs = todayStats?.total_today || 0;
  const latestBatch = todayStats?.latest_batch || 0;

  // ── Computed stats ──
  const stats = useMemo(() => {
    const saved = applications.filter((a: any) => a.status === 'saved').length;
    const applied = applications.filter((a: any) =>
      ['applied', 'hr_screen', 'technical', 'behavioral', 'final', 'offer'].includes(a.status)
    ).length;
    const interviews = applications.filter((a: any) =>
      ['hr_screen', 'technical', 'behavioral', 'final'].includes(a.status)
    ).length;
    const offers = applications.filter((a: any) => a.status === 'offer').length;

    // This week's applications
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const appliedThisWeek = applications.filter((a: any) => {
      const d = new Date(a.applied_at || a.created_at);
      return d >= weekStart && ['applied', 'hr_screen', 'technical', 'behavioral', 'final', 'offer'].includes(a.status);
    }).length;

    return { saved, applied, interviews, offers, appliedThisWeek };
  }, [applications]);

  // ── Follow-up items for calendar & highlights ──
  const calendarData = useMemo(() => {
    const pending = followUps.filter((f: any) => !f.is_completed);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - today.getDay()));

    const dueToday = pending.filter((f: any) => {
      const d = new Date(f.due_date);
      return d >= today && d < tomorrow;
    }).length;

    const dueThisWeek = pending.filter((f: any) => {
      const d = new Date(f.due_date);
      return d >= today && d < endOfWeek;
    }).length;

    // Dates with follow-ups (for calendar dots)
    const followUpDates = new Set(
      pending.map((f: any) => new Date(f.due_date).toDateString())
    );

    return { dueToday, dueThisWeek, followUpDates, pendingItems: pending };
  }, [followUps]);

  // Weekly goal for donut (free: 5, paid: 15)
  const weeklyGoal = tier === 'free' ? 5 : 15;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">

        {/* ── STATS ROW ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 h-[130px]">
                <Skeleton lines={3} />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {/* Today's Jobs — with live delta */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 animate-fade-in hover:border-slate-300 dark:hover:border-slate-600 transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <Sparkles size={18} className="text-blue-500" />
                </div>
                {latestBatch > 0 && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50">
                    <TrendingUp size={12} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">+{latestBatch}</span>
                  </div>
                )}
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{totalTodayJobs}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Today&apos;s jobs
                {latestBatch > 0 && <span className="text-emerald-600 dark:text-emerald-400 ml-1">· {latestBatch} new in latest fetch</span>}
              </p>
            </div>

            {/* Applied This Week — donut chart */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 animate-fade-in hover:border-slate-300 dark:hover:border-slate-600 transition-colors" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center gap-4">
                <DonutChart value={stats.appliedThisWeek} max={weeklyGoal} />
                <div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.appliedThisWeek}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Applied this week</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {stats.appliedThisWeek >= weeklyGoal
                      ? '🎯 Goal reached!'
                      : `${weeklyGoal - stats.appliedThisWeek} more to hit your goal`
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Total Saved */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 animate-fade-in hover:border-slate-300 dark:hover:border-slate-600 transition-colors" style={{ animationDelay: '200ms' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
                  <Bookmark size={18} className="text-violet-500" />
                </div>
                {stats.interviews > 0 && (
                  <Badge variant="success">{stats.interviews} interview{stats.interviews > 1 ? 's' : ''}</Badge>
                )}
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{stats.saved}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Saved jobs · {stats.applied} applied total
              </p>
            </div>
          </div>
        )}

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-6">

          {/* LEFT 3/5 — Detailed Job Cards */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-karmio-50 dark:bg-karmio-900/30 flex items-center justify-center">
                  <Sparkles size={16} className="text-karmio-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Today&apos;s Jobs</p>
                  <p className="text-[10px] text-slate-400">{totalTodayJobs} jobs fetched today</p>
                </div>
              </div>
              <Link href="/dashboard/jobs/feed" className="text-xs text-karmio-500 hover:text-karmio-600 flex items-center gap-1 font-medium">
                View all <ArrowRight size={12} />
              </Link>
            </div>

            {jobsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 animate-pulse">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800" />
                      <div className="flex-1">
                        <div className="h-5 w-64 bg-slate-100 dark:bg-slate-800 rounded mb-2" />
                        <div className="h-4 w-48 bg-slate-100 dark:bg-slate-800 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : todayJobs.length > 0 ? (
              <div className="space-y-4">
                {todayJobs.slice(0, 6).map((job: any) => (
                  <DashboardJobCard key={job.id} job={job} />
                ))}
              </div>
            ) : (
              <Card padding="lg" className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                  <Search size={22} className="text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">No new jobs today yet</p>
                <p className="text-xs text-slate-400 mb-4">Jobs are fetched every few hours. Check back soon!</p>
                <Link href="/dashboard/jobs/feed" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-karmio-600 bg-karmio-50 dark:bg-karmio-900/20 rounded-xl hover:bg-karmio-100 dark:hover:bg-karmio-900/30 transition-colors">
                  Browse all jobs <ArrowRight size={14} />
                </Link>
              </Card>
            )}
          </div>

          {/* RIGHT 2/5 — Calendar, Highlights, Quick Actions, Pipeline */}
          <div className="lg:col-span-2 space-y-4">

            {/* Mini Calendar + Highlights */}
            <Card padding="lg" className="animate-fade-in">
              <MiniCalendar followUpDates={calendarData.followUpDates} />

              {/* This week's highlights */}
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">This Week</p>
                <div className="space-y-2.5">
                  <HighlightItem
                    icon={<Sparkles size={13} />}
                    label={`${totalTodayJobs} new jobs today`}
                    color="text-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  />
                  {calendarData.dueToday > 0 && (
                    <HighlightItem
                      icon={<Send size={13} />}
                      label={`${calendarData.dueToday} follow-up${calendarData.dueToday > 1 ? 's' : ''} due today`}
                      color="text-amber-500 bg-amber-50 dark:bg-amber-900/20"
                      urgent
                    />
                  )}
                  {calendarData.dueThisWeek > 0 && (
                    <HighlightItem
                      icon={<Target size={13} />}
                      label={`${calendarData.dueThisWeek} to-do${calendarData.dueThisWeek > 1 ? 's' : ''} this week`}
                      color="text-violet-500 bg-violet-50 dark:bg-violet-900/20"
                    />
                  )}
                  {stats.interviews > 0 && (
                    <HighlightItem
                      icon={<Briefcase size={13} />}
                      label={`${stats.interviews} active interview${stats.interviews > 1 ? 's' : ''}`}
                      color="text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                    />
                  )}
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card padding="lg" className="animate-fade-in">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">Quick Actions</p>
              <div className="space-y-1">
                <QuickAction href="/dashboard/jobs/feed" icon={<Search size={15} />} label="Browse jobs" color="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" />
                <QuickAction href="/dashboard/resumes/profile" icon={<FileText size={15} />} label="Update profile" color="bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400" />
                <QuickAction href="/dashboard/network/contacts" icon={<Users size={15} />} label="Networking" color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" />
              </div>
            </Card>

            {/* Motivational Pipeline */}
            <Card padding="lg" className="animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                    <Briefcase size={14} className="text-indigo-500" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Your Pipeline</p>
                </div>
                <Link href="/dashboard/jobs/pipeline" className="text-xs text-karmio-500 hover:text-karmio-600 flex items-center gap-1 font-medium">
                  View <ArrowRight size={12} />
                </Link>
              </div>

              <PipelineTracker
                saved={stats.saved}
                applied={stats.applied}
                interviews={stats.interviews}
                offers={stats.offers}
              />
            </Card>

            {/* Subtle Upgrade Link — bottom of sidebar */}
            {tier === 'free' && (
              <Link
                href="/dashboard/subscription"
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-karmio-300 hover:text-karmio-600 dark:hover:text-karmio-400 transition-all text-xs group"
              >
                <Zap size={14} className="group-hover:text-karmio-500 transition-colors" />
                <span>Upgrade to Popular for unlimited applications</span>
                <ArrowRight size={12} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ─── Donut Chart for Applied This Week ───
function DonutChart({ value, max }: { value: number; max: number }) {
  const size = 72;
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const offset = circumference - pct * circumference;
  const color = pct >= 1 ? '#10B981' : pct >= 0.6 ? '#8B5CF6' : '#3B82F6';

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth}
          className="stroke-slate-100 dark:stroke-slate-800" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color}
          strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{value}/{max}</span>
      </div>
    </div>
  );
}

// ─── Dashboard Job Card (detailed, like feed) ───
function DashboardJobCard({ job }: { job: IJobCardData }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const ghostAnalysis = analyzeGhostJob(job);
  const ghostLabel = getGhostLabel(ghostAnalysis);
  const ghostColor = getGhostColor(ghostAnalysis);

  const logoUrl = `https://logo.clearbit.com/${job.company_name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
  const companyInitial = job.company_name.charAt(0).toUpperCase();

  const handleSave = async () => {
    if (saved || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id, status: 'saved' }),
      });
      const json = await res.json();
      if (json.success || json.error?.code === 'DUPLICATE_APPLICATION') setSaved(true);
    } catch {}
    setSaving(false);
  };

  const handleApply = () => {
    if (job.source_url && job.source_url !== '#') {
      window.open(job.source_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className={`p-5 rounded-2xl border bg-white dark:bg-slate-900 transition-all hover:shadow-md ${
      ghostAnalysis.ghostScore >= 30
        ? 'border-amber-200 dark:border-amber-800/50'
        : 'border-slate-200 dark:border-slate-700/50'
    }`}>
      <div className="flex items-start gap-4">
        {/* Logo */}
        <div className="w-11 h-11 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center bg-white dark:bg-slate-800 overflow-hidden flex-shrink-0">
          <img src={logoUrl} alt="" className="w-7 h-7 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-base font-medium text-slate-400">${companyInitial}</span>`;
            }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">{job.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {job.company_name} · {job.location || 'Remote'}
                {job.remote_type !== 'onsite' && ` · ${job.remote_type}`}
              </p>
            </div>
            <MatchRing score={job.match_score || 0} size={38} />
          </div>

          {/* Description preview */}
          <p className="text-xs text-slate-500 mt-2.5 line-clamp-2 leading-relaxed">
            {job.description_raw?.slice(0, 180)}...
          </p>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
              job.sponsorship_status === 'yes'
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                : job.sponsorship_status === 'no'
                ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
            }`}>
              {job.sponsorship_status === 'yes' ? 'Sponsors visa' : job.sponsorship_status === 'no' ? 'No sponsorship' : 'Visa unknown'}
            </span>
            {job.salary_min && job.salary_max && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                ${Math.round(job.salary_min / 1000)}k–${Math.round(job.salary_max / 1000)}k
              </span>
            )}
            {ghostLabel && (
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                ghostColor === 'red'
                  ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
              }`}>{ghostLabel}</span>
            )}
            <span className="text-[10px] text-slate-400 ml-auto">via {job.source_type}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button onClick={handleSave} disabled={saving || saved}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                saved
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}>
              <BookmarkCheck size={13} />
              {saved ? 'Saved' : saving ? '...' : 'Save'}
            </button>
            <button onClick={() => router.push(`/dashboard/resumes/builder?job=${job.id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-karmio-200 dark:border-karmio-800 text-karmio-600 dark:text-karmio-400 hover:bg-karmio-50 dark:hover:bg-karmio-900/30 transition-all">
              <FileText size={13} />
              Tailor
            </button>
            <button onClick={handleApply}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-karmio-500 text-white hover:bg-karmio-600 transition-all ml-auto">
              <ExternalLink size={13} />
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mini Calendar ───
function MiniCalendar({ followUpDates }: { followUpDates: Set<string> }) {
  const [viewDate, setViewDate] = useState(new Date());
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // First day of month and total days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{monthName}</p>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="w-6 h-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors">
            <ChevronLeft size={14} className="text-slate-400" />
          </button>
          <button onClick={nextMonth} className="w-6 h-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors">
            <ChevronRight size={14} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-slate-400 py-1">{d}</div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = new Date(year, month, day);
          const isToday = date.toDateString() === today.toDateString();
          const hasEvent = followUpDates.has(date.toDateString());
          const isPast = date < today;

          return (
            <div key={day} className={`relative text-center py-1.5 rounded-lg text-xs transition-colors ${
              isToday
                ? 'bg-karmio-500 text-white font-bold'
                : hasEvent
                ? 'bg-karmio-50 dark:bg-karmio-900/20 text-karmio-700 dark:text-karmio-300 font-medium'
                : isPast
                ? 'text-slate-300 dark:text-slate-600'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}>
              {day}
              {hasEvent && !isToday && (
                <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-karmio-500" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Highlight Item ───
function HighlightItem({ icon, label, color, urgent }: {
  icon: React.ReactNode; label: string; color: string; urgent?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <p className={`text-xs ${urgent ? 'font-semibold text-amber-700 dark:text-amber-300' : 'text-slate-600 dark:text-slate-400'}`}>
        {label}
      </p>
    </div>
  );
}

// ─── Quick Action ───
function QuickAction({ href, icon, label, color }: {
  href: string; icon: React.ReactNode; label: string; color: string;
}) {
  return (
    <Link href={href}
      className="flex items-center gap-3 p-2.5 rounded-xl transition-all hover:translate-x-1 hover:bg-slate-50 dark:hover:bg-slate-800/30">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>{icon}</div>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
      <ArrowRight size={14} className="ml-auto text-slate-300 dark:text-slate-600" />
    </Link>
  );
}

// ─── Motivational Pipeline Tracker ───
function PipelineTracker({ saved, applied, interviews, offers }: {
  saved: number; applied: number; interviews: number; offers: number;
}) {
  const stages = [
    { label: 'Saved', count: saved, color: 'bg-blue-500', ring: 'ring-blue-200 dark:ring-blue-800', icon: <BookmarkCheck size={12} /> },
    { label: 'Applied', count: applied, color: 'bg-violet-500', ring: 'ring-violet-200 dark:ring-violet-800', icon: <Send size={12} /> },
    { label: 'Interviews', count: interviews, color: 'bg-amber-500', ring: 'ring-amber-200 dark:ring-amber-800', icon: <Briefcase size={12} /> },
    { label: 'Offers', count: offers, color: 'bg-emerald-500', ring: 'ring-emerald-200 dark:ring-emerald-800', icon: <Target size={12} /> },
  ];

  const total = saved + applied + interviews + offers;
  const motivationalText = total === 0
    ? 'Start saving jobs to build your pipeline!'
    : offers > 0
    ? '🎉 You have offers! Congratulations!'
    : interviews > 0
    ? '🔥 Interviews in progress — you\'re doing great!'
    : applied > 0
    ? '💪 Keep applying — momentum builds success!'
    : '📌 Saved jobs are your starting point. Start applying!';

  return (
    <div>
      {/* Vertical pipeline */}
      <div className="space-y-0">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex items-center gap-3 relative">
            {/* Connector line */}
            {i < stages.length - 1 && (
              <div className="absolute left-[14px] top-[28px] w-[2px] h-[20px] bg-slate-200 dark:bg-slate-700" />
            )}
            {/* Dot */}
            <div className={`w-7 h-7 rounded-full ${stage.count > 0 ? stage.color : 'bg-slate-200 dark:bg-slate-700'} flex items-center justify-center text-white flex-shrink-0 ${stage.count > 0 ? `ring-2 ${stage.ring}` : ''}`}>
              {stage.icon}
            </div>
            <div className="flex-1 flex items-center justify-between py-2.5">
              <span className={`text-xs ${stage.count > 0 ? 'font-medium text-slate-700 dark:text-slate-300' : 'text-slate-400'}`}>
                {stage.label}
              </span>
              <span className={`text-sm font-bold ${stage.count > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-300 dark:text-slate-600'}`}>
                {stage.count}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Motivational text */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center italic">
          {motivationalText}
        </p>
      </div>
    </div>
  );
}