'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { MetricCard } from '@/components/ui/Card';
import { DailyBriefing } from '@/components/dashboard/DailyBriefing';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { JobCard } from '@/components/jobs/JobCard';
import { useAuth } from '@/hooks/useAuth';
import { IJobCardData } from '@/types';
import { Skeleton } from '@/components/shared/Helpers';

export default function DashboardHomePage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<IJobCardData[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [jobsRes, appsRes] = await Promise.allSettled([
          fetch('/api/jobs?limit=5&sort_by=match').then(r => r.json()),
          fetch('/api/applications').then(r => r.json()),
        ]);

        if (jobsRes.status === 'fulfilled' && jobsRes.value.success) {
          setJobs(jobsRes.value.data || []);
        }
        if (appsRes.status === 'fulfilled' && appsRes.value.success) {
          setApplications(appsRes.value.data || []);
        }
      } catch (err) {
        console.error('Dashboard data fetch error:', err);
      }
      setLoading(false);
    };

    fetchDashboardData();
  }, [user]);

  // Compute metrics from real data
  const totalApplied = applications.filter(a => a.status !== 'saved').length;
  const appliedThisWeek = applications.filter(a => {
    if (!a.applied_at) return false;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(a.applied_at) > weekAgo;
  }).length;
  const callbacks = applications.filter(a => ['hr_screen', 'technical', 'behavioral', 'final', 'offer'].includes(a.status)).length;
  const callbackRate = totalApplied > 0 ? Math.round((callbacks / totalApplied) * 100) : 0;
  const avgMatch = jobs.length > 0 ? Math.round(jobs.reduce((sum, j) => sum + (j.match_score || 0), 0) / jobs.length) : 0;

  // Build briefing from real data
  const followUpsDue = applications.filter(a => {
    if (a.status === 'applied' && a.applied_at) {
      const daysSince = Math.floor((Date.now() - new Date(a.applied_at).getTime()) / 86400000);
      return daysSince >= 7;
    }
    return false;
  }).length;

  const nextInterview = applications.find(a =>
    ['hr_screen', 'technical', 'behavioral'].includes(a.status)
  );

  return (
    <AppShell>
      {/* Daily briefing */}
      <DailyBriefing data={{
        new_matches: jobs.length,
        follow_ups_due: followUpsDue,
        next_interview: nextInterview ? {
          company: nextInterview.job?.company_name || 'Unknown',
          type: nextInterview.status === 'hr_screen' ? 'HR' : nextInterview.status === 'technical' ? 'Technical' : 'Behavioral',
          day: 'this week',
        } : undefined,
        callback_change: totalApplied > 0 ? `${callbackRate}% overall` : undefined,
      }} />

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
              <Skeleton lines={3} />
            </div>
          ))
        ) : (
          <>
            <MetricCard label="Total applied" value={totalApplied} change={`${appliedThisWeek} this week`} changeType="up" />
            <MetricCard label="Job matches" value={jobs.length} change={user?.target_profiles?.length ? `Across ${(user as any).target_profiles.length} profile${(user as any).target_profiles.length > 1 ? 's' : ''}` : 'Set up a profile'} changeType="neutral" />
            <MetricCard label="Callback rate" value={totalApplied > 0 ? `${callbackRate}%` : '--'} change={totalApplied > 0 ? 'From applications' : 'Apply to see rate'} changeType={callbackRate > 15 ? 'up' : 'neutral'} />
            <MetricCard label="Avg match score" value={jobs.length > 0 ? `${avgMatch}%` : '--'} change={avgMatch >= 70 ? 'Strong matches' : avgMatch > 0 ? 'Check your profile' : 'No jobs yet'} changeType={avgMatch >= 70 ? 'up' : 'neutral'} />
          </>
        )}
      </div>

      {/* Chart + Upcoming row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4">
          <p className="text-sm font-medium text-slate-900 dark:text-white mb-3">Weekly activity</p>
          {loading ? (
            <div className="h-36 flex items-center justify-center">
              <Skeleton lines={2} />
            </div>
          ) : applications.length > 0 ? (
            <WeeklyActivityChart applications={applications} />
          ) : (
            <div className="h-36 flex items-center justify-center text-sm text-slate-400">
              <div className="text-center">
                <p>No activity yet</p>
                <p className="text-xs mt-1">Start applying to jobs to see your weekly chart</p>
              </div>
            </div>
          )}
        </div>

        {/* Upcoming */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4">
          <p className="text-sm font-medium text-slate-900 dark:text-white mb-3">Upcoming</p>
          {loading ? (
            <Skeleton lines={4} />
          ) : followUpsDue > 0 || nextInterview ? (
            <div className="space-y-0">
              {followUpsDue > 0 && (
                <div className="py-2.5 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Today</p>
                  <p className="text-xs text-slate-500 mt-0.5">{followUpsDue} follow-up{followUpsDue > 1 ? 's' : ''} due</p>
                </div>
              )}
              {nextInterview && (
                <div className="py-2.5 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">This week</p>
                  <p className="text-xs text-slate-500 mt-0.5">{nextInterview.job?.company_name} — {nextInterview.status.replace('_', ' ')} round</p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-400">
              <p>Nothing upcoming</p>
              <p className="mt-1">Apply to jobs to see follow-ups and interviews here</p>
            </div>
          )}
        </div>
      </div>

      {/* Job matches */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
            {jobs.length > 0 ? "Today's matches" : 'Job matches'}
            {jobs.length > 0 && <Badge variant="info">{jobs.length} jobs</Badge>}
          </h2>
          <Link href="/dashboard/jobs/feed">
            <Button size="sm" variant="ghost">View all jobs</Button>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4">
                <Skeleton lines={3} />
              </div>
            ))}
          </div>
        ) : jobs.length > 0 ? (
          <div className="space-y-3">
            {jobs.slice(0, 5).map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onStatusChange={() => {
                  // Refresh applications data when user applies/saves
                  fetch('/api/applications').then(r => r.json()).then(json => {
                    if (json.success) setApplications(json.data || []);
                  });
                }}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-8 text-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 text-slate-300">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <p className="text-sm text-slate-500">No job matches yet</p>
            <p className="text-xs text-slate-400 mt-1">
              {!(user as any)?.target_profiles?.length
                ? 'Complete your profile to start seeing matched jobs.'
                : 'New jobs are fetched regularly. Check back soon!'}
            </p>
            {!(user as any)?.target_profiles?.length && (
              <Link href="/dashboard/resumes/profile" className="inline-block mt-3">
                <Button variant="primary" size="sm">Complete profile</Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function WeeklyActivityChart({ applications }: { applications: any[] }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const now = new Date();
  const weekData = days.map((label, i) => {
    const dayDate = new Date(now);
    const currentDay = now.getDay();
    const diff = (currentDay === 0 ? -6 : 1 - currentDay) + i;
    dayDate.setDate(now.getDate() + diff);
    dayDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(dayDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const applied = applications.filter(a => {
      if (!a.applied_at) return false;
      const d = new Date(a.applied_at);
      return d >= dayDate && d < nextDay;
    }).length;

    return { label, applied };
  });

  const maxVal = Math.max(1, ...weekData.map(d => d.applied));

  return (
    <>
      <div className="h-36 flex items-end gap-1 px-2">
        {weekData.map((d) => (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex gap-0.5 items-end justify-center" style={{ height: '100px' }}>
              <div className="w-5 bg-emerald-300 dark:bg-emerald-700 rounded-t transition-all" style={{ height: `${Math.max(4, (d.applied / maxVal) * 100)}%` }} />
            </div>
            <span className="text-[10px] text-slate-400">{d.label}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-3 text-[11px] text-slate-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />Applied</span>
      </div>
    </>
  );
}
