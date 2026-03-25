'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { IJobCardData } from '@/types';

export default function DashboardHomePage() {
  const { user } = useAuth();
  const [recentJobs, setRecentJobs] = useState<IJobCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ saved: 0, applied: 0, interviews: 0 });

  useEffect(() => {
    if (!user) return;

    // Fetch recent jobs
    fetch('/api/jobs?limit=5&posted_within=7d')
      .then(res => res.json())
      .then(json => {
        if (json.success) setRecentJobs(json.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Fetch application stats
    fetch('/api/applications')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          const apps = json.data;
          setStats({
            saved: apps.filter((a: any) => a.status === 'saved').length,
            applied: apps.filter((a: any) => ['applied', 'hr_screen', 'technical', 'behavioral', 'final'].includes(a.status)).length,
            interviews: apps.filter((a: any) => ['hr_screen', 'technical', 'behavioral', 'final'].includes(a.status)).length,
          });
        }
      })
      .catch(() => {});
  }, [user]);

  const greeting = getGreeting();
  const firstName = user?.full_name?.split(' ')[0] || 'there';

  return (
    <AppShell>
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-surface-900 dark:text-white mb-1">
            {greeting}, {firstName}
          </h1>
          <p className="text-surface-500">Here is what is happening with your job search.</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard
            label="Saved jobs"
            value={stats.saved}
            href="/dashboard/jobs/saved"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
            }
          />
          <StatCard
            label="Applied"
            value={stats.applied}
            href="/dashboard/jobs/applied"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <path d="M22 4L12 14.01l-3-3" />
              </svg>
            }
          />
          <StatCard
            label="Interviews"
            value={stats.interviews}
            href="/dashboard/jobs/pipeline"
            highlight
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            }
          />
        </div>

        {/* Quick actions */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Link
            href="/dashboard/jobs/feed"
            className="p-6 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-karmio-300 dark:hover:border-karmio-700 transition-all group"
            data-testid="action-browse-jobs"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-karmio-50 dark:bg-karmio-900/30 flex items-center justify-center text-karmio-500">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-300 group-hover:text-karmio-500 group-hover:translate-x-1 transition-all">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-1">Browse jobs</h3>
            <p className="text-sm text-surface-500">Find your next opportunity from verified listings</p>
          </Link>

          <Link
            href="/dashboard/resumes/profile"
            className="p-6 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-karmio-300 dark:hover:border-karmio-700 transition-all group"
            data-testid="action-build-resume"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                </svg>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-1">Build your resume</h3>
            <p className="text-sm text-surface-500">Create tailored resumes for each application</p>
          </Link>
        </div>

        {/* Recent jobs */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Recent opportunities</h2>
            <Link href="/dashboard/jobs/feed" className="text-sm text-karmio-500 hover:text-karmio-600 font-medium">
              View all
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-5 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-surface-100 dark:bg-surface-800" />
                    <div className="flex-1">
                      <div className="h-4 w-48 bg-surface-100 dark:bg-surface-800 rounded mb-2" />
                      <div className="h-3 w-32 bg-surface-100 dark:bg-surface-800 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentJobs.length > 0 ? (
            <div className="space-y-3">
              {recentJobs.map(job => (
                <JobPreviewCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-center">
              <div className="w-12 h-12 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-400">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              <p className="text-surface-600 dark:text-surface-400 mb-4">No jobs loaded yet</p>
              <Link href="/dashboard/jobs/feed" className="btn btn-primary btn-sm">
                Browse jobs
              </Link>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value, href, icon, highlight }: {
  label: string;
  value: number;
  href: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`p-5 rounded-2xl border transition-all ${
        highlight
          ? 'border-karmio-200 dark:border-karmio-800 bg-karmio-50 dark:bg-karmio-900/20 hover:border-karmio-300'
          : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-surface-300 dark:hover:border-surface-600'
      }`}
    >
      <div className={`mb-3 ${highlight ? 'text-karmio-500' : 'text-surface-400'}`}>
        {icon}
      </div>
      <div className="text-2xl font-semibold text-surface-900 dark:text-white">{value}</div>
      <div className="text-sm text-surface-500">{label}</div>
    </Link>
  );
}

function JobPreviewCard({ job }: { job: IJobCardData }) {
  const companyInitial = job.company_name.charAt(0).toUpperCase();
  const logoUrl = guessLogoUrl(job.company_name);

  return (
    <Link
      href="/dashboard/jobs/feed"
      className="block p-5 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-karmio-300 dark:hover:border-karmio-700 transition-all"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl border border-surface-200 dark:border-surface-700 flex items-center justify-center bg-white dark:bg-surface-800 overflow-hidden flex-shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="w-8 h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <span className="text-lg font-medium text-surface-400">{companyInitial}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-surface-900 dark:text-white truncate">{job.title}</h3>
          <p className="text-sm text-surface-500 truncate">
            {job.company_name} · {job.location}
            {job.remote_type !== 'onsite' && ` · ${job.remote_type}`}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {job.salary_min && job.salary_max && (
            <span className="text-sm text-surface-500">
              ${Math.round(job.salary_min / 1000)}k+
            </span>
          )}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
            job.match_score >= 80 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
            job.match_score >= 60 ? 'bg-karmio-50 text-karmio-600 dark:bg-karmio-900/30 dark:text-karmio-400' :
            'bg-surface-100 text-surface-500 dark:bg-surface-800'
          }`}>
            {job.match_score || 0}
          </div>
        </div>
      </div>
    </Link>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function guessLogoUrl(companyName: string): string | null {
  const overrides: Record<string, string> = {
    'stripe': 'stripe.com', 'google': 'google.com', 'meta': 'meta.com',
    'amazon': 'amazon.com', 'microsoft': 'microsoft.com', 'apple': 'apple.com',
    'netflix': 'netflix.com', 'spotify': 'spotify.com', 'airbnb': 'airbnb.com',
    'openai': 'openai.com',
  };
  const lower = companyName.toLowerCase();
  const domain = overrides[lower] || `${lower.replace(/[^a-z0-9]/g, '')}.com`;
  return `https://logo.clearbit.com/${domain}`;
}
