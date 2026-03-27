'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { useApplications } from '@/hooks/useApplications';
import { IJobCardData } from '@/types';
import { analyzeGhostJob } from '@/lib/jobs/ghost-detector';
import { JobCard } from '@/components/jobs/JobCard';
import Link from 'next/link';
import {
  Search, Sparkles, Bookmark, CheckCircle2,
  ArrowRight, RefreshCw, X,
} from 'lucide-react';

type FeedTab = 'recommended' | 'saved' | 'applied';
type PostedWithin = '1d' | '2d' | '7d' | '14d' | '30d';
type SortBy = 'match' | 'date' | 'realness';

export default function JobFeedPage() {
  const { user } = useAuth();
  const { data: applications = [], isLoading: appsLoading } = useApplications();

  const [jobs, setJobs] = useState<IJobCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FeedTab>('recommended');
  const [filters, setFilters] = useState({
    posted_within: '7d' as PostedWithin,
    sponsorship: '',
    remote_type: '',
    sort_by: 'match' as SortBy,
    hideGhosts: true,
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.posted_within) params.set('posted_within', filters.posted_within);
      if (filters.sponsorship) params.set('sponsorship', filters.sponsorship);
      if (filters.remote_type) params.set('remote_type', filters.remote_type);
      if (filters.sort_by) params.set('sort_by', filters.sort_by);
      if (debouncedSearch) params.set('search', debouncedSearch);
      params.set('limit', '50');

      const res = await fetch(`/api/jobs?${params.toString()}`);
      const json = await res.json();
      if (json.success) setJobs(json.data || []);
    } catch (err) {
      console.error('Job fetch error:', err);
    }
    setLoading(false);
  }, [filters, debouncedSearch]);

  useEffect(() => {
    if (user) fetchJobs();
  }, [user, fetchJobs]);

  // Compute saved/applied sets
  const savedJobIds = useMemo(() => {
    const set = new Set<string>();
    applications.filter((a: any) => a.status === 'saved').forEach((a: any) => set.add(a.job_id));
    return set;
  }, [applications]);

  const appliedJobIds = useMemo(() => {
    const set = new Set<string>();
    applications.filter((a: any) =>
      ['applied', 'hr_screen', 'technical', 'behavioral', 'final', 'offer'].includes(a.status)
    ).forEach((a: any) => set.add(a.job_id));
    return set;
  }, [applications]);

  const savedJobs = useMemo(() =>
    applications
      .filter((a: any) => a.status === 'saved' && a.job_postings)
      .map((a: any) => ({ ...a.job_postings, application_id: a.id, match_score: a.match_score || 0 })),
    [applications]
  );

  const appliedJobs = useMemo(() =>
    applications
      .filter((a: any) =>
        ['applied', 'hr_screen', 'technical', 'behavioral', 'final', 'offer'].includes(a.status) && a.job_postings
      )
      .map((a: any) => ({
        ...a.job_postings, application_id: a.id,
        application_status: a.status, match_score: a.match_score || 0,
      })),
    [applications]
  );

  // Filter recommended
  const filteredRecommended = useMemo(() => {
    return jobs.filter(job => {
      if (savedJobIds.has(job.id) || appliedJobIds.has(job.id)) return false;
      if (filters.hideGhosts) {
        const analysis = analyzeGhostJob(job);
        if (analysis.ghostScore >= 50) return false;
      }
      return true;
    });
  }, [jobs, savedJobIds, appliedJobIds, filters.hideGhosts]);

  const tabCounts = {
    recommended: filteredRecommended.length,
    saved: savedJobs.length,
    applied: appliedJobs.length,
  };

  const tabs: { key: FeedTab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'recommended', label: 'Recommended', icon: <Sparkles size={13} />, count: tabCounts.recommended },
    { key: 'saved', label: 'Saved', icon: <Bookmark size={13} />, count: tabCounts.saved },
    { key: 'applied', label: 'Applied', icon: <CheckCircle2 size={13} />, count: tabCounts.applied },
  ];

  const displayJobs = activeTab === 'recommended'
    ? filteredRecommended
    : activeTab === 'saved' ? savedJobs : appliedJobs;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <div className="mb-5">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Job feed</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Verified jobs from company career pages. Updated every 2 hours.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-4 border-b border-slate-200 dark:border-slate-700/50">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-karmio-600 text-karmio-600 dark:text-karmio-400 dark:border-karmio-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              {tab.icon}
              {tab.label}
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[11px] font-semibold ${
                activeTab === tab.key
                  ? 'bg-karmio-100 text-karmio-700 dark:bg-karmio-900/40 dark:text-karmio-300'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search + Filters (Recommended only) */}
        {activeTab === 'recommended' && (
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search jobs or companies..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700
                  bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white
                  placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-karmio-500/30 focus:border-karmio-500"
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select value={filters.posted_within}
                onChange={e => setFilters(f => ({ ...f, posted_within: e.target.value as PostedWithin }))}
                className="text-xs px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700
                  bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer">
                <option value="1d">Last 24 hours</option>
                <option value="2d">Last 2 days</option>
                <option value="7d">Last 7 days</option>
                <option value="14d">Last 14 days</option>
                <option value="30d">Last 30 days</option>
              </select>

              <select value={filters.remote_type}
                onChange={e => setFilters(f => ({ ...f, remote_type: e.target.value }))}
                className="text-xs px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700
                  bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer">
                <option value="">All locations</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
              </select>

              <select value={filters.sponsorship}
                onChange={e => setFilters(f => ({ ...f, sponsorship: e.target.value }))}
                className="text-xs px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700
                  bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer">
                <option value="">All sponsorship</option>
                <option value="yes">Sponsors visa</option>
                <option value="no">No sponsorship</option>
                <option value="unknown">Unknown</option>
              </select>

              <select value={filters.sort_by}
                onChange={e => setFilters(f => ({ ...f, sort_by: e.target.value as SortBy }))}
                className="text-xs px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700
                  bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer">
                <option value="match">Sort: Best match</option>
                <option value="date">Sort: Newest first</option>
                <option value="realness">Sort: Quality score</option>
              </select>

              <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                <input type="checkbox" checked={filters.hideGhosts}
                  onChange={e => setFilters(f => ({ ...f, hideGhosts: e.target.checked }))}
                  className="rounded border-slate-300 text-karmio-600 focus:ring-karmio-500 w-3.5 h-3.5" />
                Hide stale jobs
              </label>

              <button onClick={fetchJobs} disabled={loading}
                className="ml-auto flex items-center gap-1.5 text-xs text-slate-500 hover:text-karmio-600
                  dark:text-slate-400 dark:hover:text-karmio-400 transition-colors">
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>
        )}

        {/* Results count */}
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          {displayJobs.length} {displayJobs.length === 1 ? 'job' : 'jobs'} found
          {activeTab === 'recommended' && filters.sort_by === 'match' && ' · sorted by match score'}
        </p>

        {/* Job List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                  </div>
                  <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-700" />
                </div>
              </div>
            ))}
          </div>
        ) : displayJobs.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/50">
            {activeTab === 'recommended' ? (
              <>
                <Search size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-slate-600 dark:text-slate-300 font-medium">
                  {search ? 'No jobs match your search' : 'No new jobs today yet'}
                </p>
                <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                  {search ? 'Try different keywords or broaden your filters.'
                    : 'Jobs are fetched every 2 hours from real career pages. Check back soon!'}
                </p>
                {!search && (
                  <button
                    onClick={() => setFilters(f => ({ ...f, posted_within: '30d' as PostedWithin }))}
                    className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg bg-karmio-600 text-white text-sm font-medium hover:bg-karmio-700 transition-colors">
                    Browse all jobs <ArrowRight size={14} />
                  </button>
                )}
              </>
            ) : activeTab === 'saved' ? (
              <>
                <Bookmark size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-slate-600 dark:text-slate-300 font-medium">No saved jobs yet</p>
                <p className="text-sm text-slate-400 mt-1">Save jobs from the Recommended tab to review them later.</p>
              </>
            ) : (
              <>
                <CheckCircle2 size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-slate-600 dark:text-slate-300 font-medium">No applications yet</p>
                <p className="text-sm text-slate-400 mt-1">Start applying to track your progress.</p>
                <Link href="/dashboard/jobs/pipeline"
                  className="inline-flex items-center gap-1.5 mt-4 text-sm text-karmio-600 hover:text-karmio-700 font-medium">
                  View pipeline board <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displayJobs.map((job: any) => (
              <JobCard
                key={job.id}
                job={job}
                isSaved={savedJobIds.has(job.id)}
                isApplied={appliedJobIds.has(job.id)}
                applicationStatus={activeTab === 'applied' ? job.application_status : undefined}
              />
            ))}
          </div>
        )}

        {displayJobs.length >= 30 && activeTab === 'recommended' && (
          <div className="text-center py-6">
            <button className="text-sm text-karmio-600 hover:text-karmio-700 font-medium">Load more jobs</button>
          </div>
        )}
      </div>
    </AppShell>
  );
}