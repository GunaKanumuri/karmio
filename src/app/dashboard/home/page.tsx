'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge, MatchRing } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DailyBriefing } from '@/components/dashboard/DailyBriefing';
import { Skeleton, UpgradePrompt } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import { useApplications } from '@/hooks/useApplications';
import { useTodayMatches } from '@/hooks/useJobs';
import { useFollowUps } from '@/hooks/useNetwork';
import { TIER_LIMITS } from '@/lib/constants';
import {
  ArrowRight, Search, FileText, Users, Zap,
  Sparkles, BookmarkCheck, Send, Phone, Trophy,
  Calendar, Clock, TrendingUp, Briefcase
} from 'lucide-react';

export default function DashboardHomePage() {
  const { user } = useAuth();
  const { data: applications = [], isLoading: appsLoading } = useApplications();
  const { data: todayJobs = [], isLoading: jobsLoading } = useTodayMatches();
  const { data: followUps = [], isLoading: followUpsLoading } = useFollowUps();

  const tier = user?.subscription_tier || 'free';
  const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS];
  const loading = appsLoading || jobsLoading;

  const stats = useMemo(() => {
    const saved = applications.filter((a: any) => a.status === 'saved').length;
    const applied = applications.filter((a: any) =>
      ['applied', 'hr_screen', 'technical', 'behavioral', 'final', 'offer'].includes(a.status)
    ).length;
    const interviews = applications.filter((a: any) =>
      ['hr_screen', 'technical', 'behavioral', 'final'].includes(a.status)
    ).length;
    const offers = applications.filter((a: any) => a.status === 'offer').length;
    const callbacks = applications.filter((a: any) =>
      ['hr_screen', 'technical', 'behavioral', 'final', 'offer'].includes(a.status)
    ).length;
    const callbackRate = applied > 0 ? Math.round((callbacks / applied) * 100) : 0;
    return { saved, applied, interviews, offers, callbackRate, callbacks };
  }, [applications]);

  const weeklyData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const applied = applications.filter((a: any) => {
        if (!a.applied_at && !a.created_at) return false;
        const t = new Date(a.applied_at || a.created_at);
        return t >= d && t < next;
      }).length;
      result.push({ label: days[d.getDay()], posted: 0, applied });
    }
    if (todayJobs.length > 0 && result.length > 0) {
      result[result.length - 1].posted = todayJobs.length;
    }
    return result;
  }, [applications, todayJobs]);

  const calendarItems = useMemo(() => {
    return followUps
      .filter((f: any) => !f.is_completed)
      .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .slice(0, 6)
      .map((f: any) => {
        const due = new Date(f.due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return {
          date: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          label: `${f.type === 'recruiter' ? 'Recruiter' : f.type === 'networking' ? 'Networking' : 'General'} follow-up (Day ${f.day_number})`,
          urgent: due <= today,
          type: f.type,
        };
      });
  }, [followUps]);

  const briefingData = useMemo(() => {
    const pendingFollowUps = followUps.filter((f: any) => {
      if (f.is_completed) return false;
      const due = new Date(f.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return due < tomorrow;
    }).length;
    return {
      new_matches: todayJobs.length,
      follow_ups_due: pendingFollowUps,
      callback_change: stats.callbackRate > 0 ? `${stats.callbackRate}%` : undefined,
    };
  }, [todayJobs, followUps, stats]);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">

        {/* Daily Briefing — Popular+ */}
        {limits.has_daily_briefing && (briefingData.new_matches > 0 || briefingData.follow_ups_due > 0) && (
          <div className="mb-6 animate-fade-in">
            <DailyBriefing data={briefingData} />
          </div>
        )}

        {/* ── STATS RINGS ── */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 h-[140px]">
                <Skeleton lines={3} />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatRing label="Saved" value={stats.saved} maxValue={Math.max(stats.saved, 20)} color="#3B82F6"
              icon={<BookmarkCheck size={16} />} subtitle={todayJobs.length > 0 ? `+${todayJobs.length} new today` : undefined} delay={0} />
            <StatRing label="Applied" value={stats.applied} maxValue={Math.max(stats.applied, 10)} color="#8B5CF6"
              icon={<Send size={16} />} delay={1} />
            <StatRing label="Interviews" value={stats.interviews} maxValue={Math.max(stats.applied, 5)} color="#F59E0B"
              icon={<Phone size={16} />} subtitle={stats.interviews > 0 ? 'Active' : undefined} delay={2} />
            <StatRing label="Callback Rate" value={stats.callbackRate} maxValue={100} color="#10B981"
              icon={<TrendingUp size={16} />} suffix="%" subtitle={stats.callbacks > 0 ? `${stats.callbacks} callback${stats.callbacks > 1 ? 's' : ''}` : undefined} delay={3} />
          </div>
        )}

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-6">

          {/* LEFT 3/5 */}
          <div className="lg:col-span-3 space-y-5">
            {/* Today's matches */}
            <Card padding="lg" className="animate-fade-in">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-karmio-50 dark:bg-karmio-900/30 flex items-center justify-center">
                    <Sparkles size={16} className="text-karmio-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Today&apos;s Top Matches</p>
                    <p className="text-[10px] text-slate-400">{todayJobs.length} jobs matched to your profile</p>
                  </div>
                </div>
                <Link href="/dashboard/jobs/feed" className="text-xs text-karmio-500 hover:text-karmio-600 flex items-center gap-1 font-medium">
                  View all <ArrowRight size={12} />
                </Link>
              </div>

              {jobsLoading ? (
                <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} lines={2} />)}</div>
              ) : todayJobs.length > 0 ? (
                <div className="space-y-1">
                  {todayJobs.slice(0, 6).map((job: any) => (
                    <Link key={job.id} href={`/dashboard/jobs/feed?highlight=${job.id}`}
                      className="flex items-center gap-4 p-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-800/50 flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase border border-slate-200/50 dark:border-slate-700/30">
                        {job.company_name?.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-karmio-600 dark:group-hover:text-karmio-400 transition-colors">{job.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-slate-500 truncate">{job.company_name}</p>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <p className="text-xs text-slate-400 truncate">{job.location || 'Remote'}</p>
                        </div>
                      </div>
                      <MatchRing score={job.match_score || 0} size={40} />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                    <Search size={20} className="text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500 mb-1">No new matches today</p>
                  <p className="text-xs text-slate-400">Check back later or adjust your target profile.</p>
                </div>
              )}
            </Card>

            {/* Weekly chart */}
            {limits.has_full_analytics || limits.has_daily_briefing ? (
              <Card padding="lg" className="animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Weekly Activity</p>
                  <div className="flex gap-4 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-300" />Jobs posted</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />Applied</span>
                  </div>
                </div>
                <div className="h-28 flex items-end gap-1.5 px-1">
                  {weeklyData.map((d) => {
                    const maxVal = Math.max(...weeklyData.map(x => Math.max(x.posted, x.applied)), 1);
                    return (
                      <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex gap-0.5 items-end justify-center" style={{ height: '90px' }}>
                          <div className="w-3 bg-blue-200 dark:bg-blue-800 rounded-t transition-all duration-500" style={{ height: `${Math.max(4, (d.posted / maxVal) * 100)}%` }} />
                          <div className="w-3 bg-emerald-300 dark:bg-emerald-700 rounded-t transition-all duration-500" style={{ height: `${Math.max(4, (d.applied / maxVal) * 100)}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400">{d.label}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ) : (
              <UpgradePrompt feature="Weekly activity chart" tierNeeded="Popular" />
            )}
          </div>

          {/* RIGHT 2/5 */}
          <div className="lg:col-span-2 space-y-5">
            {/* Upcoming */}
            <Card padding="lg" className="animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                  <Calendar size={14} className="text-amber-500" />
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Upcoming</p>
                {calendarItems.filter(c => c.urgent).length > 0 && (
                  <Badge variant="warning">{calendarItems.filter(c => c.urgent).length} due</Badge>
                )}
              </div>
              {calendarItems.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Nothing scheduled. Apply to jobs to see follow-ups here.</p>
              ) : (
                <div className="space-y-0">
                  {calendarItems.map((item, i) => (
                    <div key={i} className="py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                      <div className="flex justify-between items-center">
                        <p className={`text-xs font-medium ${item.urgent ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>{item.date}</p>
                        {item.urgent && <Badge variant="warning">due</Badge>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Quick actions */}
            <Card padding="lg" className="animate-fade-in">
              <p className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Quick Actions</p>
              <div className="space-y-1.5">
                <QuickAction href="/dashboard/jobs/feed" icon={<Search size={15} />} label="Browse jobs" color="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" />
                <QuickAction href="/dashboard/resumes/profile" icon={<FileText size={15} />} label="Update profile" color="bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400" />
                <QuickAction href="/dashboard/network/contacts" icon={<Users size={15} />} label="Networking" color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" />
                {tier === 'free' && (
                  <QuickAction href="/dashboard/subscription" icon={<Zap size={15} />} label="Upgrade plan" color="bg-karmio-50 dark:bg-karmio-900/20 text-karmio-600 dark:text-karmio-400" highlight />
                )}
              </div>
            </Card>

            {/* Pipeline */}
            {stats.applied > 0 && (
              <Card padding="lg" className="animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                      <Briefcase size={14} className="text-indigo-500" />
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Pipeline</p>
                  </div>
                  <Link href="/dashboard/jobs/pipeline" className="text-xs text-karmio-500 hover:text-karmio-600 flex items-center gap-1 font-medium">
                    View <ArrowRight size={12} />
                  </Link>
                </div>
                <div className="space-y-2">
                  {[
                    { key: 'applied', label: 'Applied', color: 'bg-blue-500', track: 'bg-blue-100 dark:bg-blue-900/30' },
                    { key: 'hr_screen', label: 'HR Screen', color: 'bg-purple-500', track: 'bg-purple-100 dark:bg-purple-900/30' },
                    { key: 'technical', label: 'Technical', color: 'bg-amber-500', track: 'bg-amber-100 dark:bg-amber-900/30' },
                    { key: 'offer', label: 'Offer', color: 'bg-emerald-500', track: 'bg-emerald-100 dark:bg-emerald-900/30' },
                  ].map(stage => {
                    const count = applications.filter((a: any) => a.status === stage.key).length;
                    if (count === 0) return null;
                    const pct = stats.applied > 0 ? Math.max(8, (count / stats.applied) * 100) : 0;
                    return (
                      <div key={stage.key}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-600 dark:text-slate-400">{stage.label}</span>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{count}</span>
                        </div>
                        <div className={`h-2 rounded-full ${stage.track} overflow-hidden`}>
                          <div className={`h-full ${stage.color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ─── Animated Stat Ring ───
function StatRing({ label, value, maxValue, color, icon, suffix = '', subtitle, delay = 0 }: {
  label: string; value: number; maxValue: number; color: string;
  icon: React.ReactNode; suffix?: string; subtitle?: string; delay?: number;
}) {
  const size = 72;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = maxValue > 0 ? (Math.min(value, maxValue) / maxValue) * circumference : 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 flex flex-col items-center text-center animate-fade-in hover:border-slate-300 dark:hover:border-slate-600 transition-colors group"
      style={{ animationDelay: `${delay * 100}ms` }}>
      <div className="relative mb-3" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-slate-100 dark:stroke-slate-800" />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={circumference - progress} strokeLinecap="round"
            className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-slate-900 dark:text-white">{value}{suffix}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-0.5">
        <span style={{ color }}>{icon}</span>
        <p className="text-xs font-medium">{label}</p>
      </div>
      {subtitle && <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">{subtitle}</p>}
    </div>
  );
}

// ─── Quick Action ───
function QuickAction({ href, icon, label, color, highlight }: {
  href: string; icon: React.ReactNode; label: string; color: string; highlight?: boolean;
}) {
  return (
    <Link href={href}
      className={`flex items-center gap-3 p-3 rounded-xl transition-all hover:translate-x-1 ${highlight ? 'bg-karmio-50/50 dark:bg-karmio-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>{icon}</div>
      <p className={`text-sm font-medium ${highlight ? 'text-karmio-700 dark:text-karmio-300' : 'text-slate-700 dark:text-slate-200'}`}>{label}</p>
      <ArrowRight size={14} className="ml-auto text-slate-300 dark:text-slate-600" />
    </Link>
  );
}