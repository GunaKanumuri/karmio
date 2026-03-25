'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { IJobCardData } from '@/types';
import { analyzeGhostJob, getGhostLabel, getGhostColor } from '@/lib/jobs/ghost-detector';
import { MatchScoreExplainer } from '@/components/jobs/MatchScoreExplainer';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function JobFeedPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<IJobCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ 
    posted_within: '7d', 
    sponsorship: '', 
    remote_type: '',
    hideGhosts: true 
  });

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.posted_within) params.set('posted_within', filters.posted_within);
      if (filters.sponsorship) params.set('sponsorship', filters.sponsorship);
      if (filters.remote_type) params.set('remote_type', filters.remote_type);
      if (search) params.set('search', search);

      const res = await fetch(`/api/jobs?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setJobs(json.data || []);
      }
    } catch (err) {
      console.error('Job fetch error:', err);
    }
    setLoading(false);
  }, [filters.posted_within, filters.sponsorship, filters.remote_type, search]);

  useEffect(() => {
    if (user) fetchJobs();
  }, [user, fetchJobs]);

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    // Search filter
    if (search) {
      const q = search.toLowerCase();
      if (!job.title.toLowerCase().includes(q) && !job.company_name.toLowerCase().includes(q)) {
        return false;
      }
    }
    // Ghost filter
    if (filters.hideGhosts) {
      const analysis = analyzeGhostJob(job);
      if (analysis.ghostScore >= 50) return false;
    }
    return true;
  });

  return (
    <AppShell>
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-surface-900 dark:text-white mb-1">Job feed</h1>
          <p className="text-surface-500">
            Verified jobs from company career pages. Updated hourly.
          </p>
        </div>

        {/* Search and filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search jobs or companies..."
              className="input-field pl-12"
              data-testid="job-search"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <FilterSelect
              value={filters.posted_within}
              onChange={v => setFilters({ ...filters, posted_within: v })}
              options={[
                { value: '1h', label: 'Last hour' },
                { value: '4h', label: 'Last 4 hours' },
                { value: '1d', label: 'Last 24 hours' },
                { value: '2d', label: 'Last 2 days' },
                { value: '7d', label: 'Last 7 days' },
              ]}
            />
            <FilterSelect
              value={filters.remote_type}
              onChange={v => setFilters({ ...filters, remote_type: v })}
              options={[
                { value: '', label: 'All locations' },
                { value: 'remote', label: 'Remote' },
                { value: 'hybrid', label: 'Hybrid' },
                { value: 'onsite', label: 'On-site' },
              ]}
            />
            <FilterSelect
              value={filters.sponsorship}
              onChange={v => setFilters({ ...filters, sponsorship: v })}
              options={[
                { value: '', label: 'All sponsorship' },
                { value: 'yes', label: 'Sponsors visa' },
                { value: 'unknown', label: 'Unknown' },
                { value: 'no', label: 'No sponsorship' },
              ]}
            />
            <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 cursor-pointer hover:border-surface-300 dark:hover:border-surface-600 transition-colors">
              <input
                type="checkbox"
                checked={filters.hideGhosts}
                onChange={e => setFilters({ ...filters, hideGhosts: e.target.checked })}
                className="w-4 h-4 rounded border-surface-300 text-karmio-500 focus:ring-karmio-500"
              />
              <span className="text-sm text-surface-600 dark:text-surface-400">Hide stale jobs</span>
            </label>
          </div>
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-sm text-surface-500 mb-4">
            {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} found
          </p>
        )}

        {/* Job list */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="p-6 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-surface-100 dark:bg-surface-800" />
                  <div className="flex-1">
                    <div className="h-5 w-64 bg-surface-100 dark:bg-surface-800 rounded mb-2" />
                    <div className="h-4 w-48 bg-surface-100 dark:bg-surface-800 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredJobs.length > 0 ? (
          <div className="space-y-4">
            {filteredJobs.map(job => (
              <JobCard key={job.id} job={job} onRefresh={fetchJobs} />
            ))}
          </div>
        ) : (
          <div className="p-12 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-400">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-surface-900 dark:text-white mb-2">No jobs found</h3>
            <p className="text-surface-500 mb-4">Try adjusting your filters or search terms.</p>
            <button
              onClick={() => setFilters({ posted_within: '7d', sponsorship: '', remote_type: '', hideGhosts: false })}
              className="btn btn-secondary btn-sm"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function FilterSelect({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="px-4 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-sm text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-2 focus:ring-karmio-500 focus:border-transparent cursor-pointer"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function JobCard({ job, onRefresh }: { job: IJobCardData; onRefresh: () => void }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showMatchDetails, setShowMatchDetails] = useState(false);
  const router = useRouter();

  const ghostAnalysis = analyzeGhostJob(job);
  const ghostLabel = getGhostLabel(ghostAnalysis);
  const ghostColor = getGhostColor(ghostAnalysis);

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
      if (json.success || json.error?.code === 'DUPLICATE_APPLICATION') {
        setSaved(true);
      }
    } catch {}
    setSaving(false);
  };

  const handleApply = async () => {
    if (applied || applying) return;
    setApplying(true);
    try {
      await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id, status: 'applied', match_score: job.match_score || 0 }),
      });
      setApplied(true);
    } catch {}
    if (job.source_url && job.source_url !== '#') {
      window.open(job.source_url, '_blank', 'noopener,noreferrer');
    }
    setApplying(false);
  };

  const logoUrl = `https://logo.clearbit.com/${job.company_name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
  const companyInitial = job.company_name.charAt(0).toUpperCase();

  return (
    <div className={`p-6 rounded-2xl border bg-white dark:bg-surface-900 transition-all hover:shadow-subtle ${
      ghostAnalysis.ghostScore >= 30 
        ? 'border-amber-200 dark:border-amber-800/50' 
        : 'border-surface-200 dark:border-surface-700'
    }`}>
      <div className="flex items-start gap-4">
        {/* Logo */}
        <div className="w-12 h-12 rounded-xl border border-surface-200 dark:border-surface-700 flex items-center justify-center bg-white dark:bg-surface-800 overflow-hidden flex-shrink-0">
          <img
            src={logoUrl}
            alt=""
            className="w-8 h-8 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-lg font-medium text-surface-400">${companyInitial}</span>`;
            }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-medium text-surface-900 dark:text-white">{job.title}</h3>
              <p className="text-surface-600 dark:text-surface-400">
                {job.company_name} · {job.location}
                {job.remote_type !== 'onsite' && ` · ${job.remote_type}`}
              </p>
            </div>
            
            {/* Match score */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
              job.match_score >= 80 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
              job.match_score >= 60 ? 'bg-karmio-50 text-karmio-600 dark:bg-karmio-900/30 dark:text-karmio-400' :
              'bg-surface-100 text-surface-500 dark:bg-surface-800'
            }`}>
              {job.match_score || 0}%
            </div>
          </div>

          {/* Description preview */}
          <p className="text-sm text-surface-500 mt-3 line-clamp-2">
            {job.description_raw?.slice(0, 200)}...
          </p>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {/* Sponsorship */}
            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
              job.sponsorship_status === 'yes' 
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' 
                : job.sponsorship_status === 'no'
                ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-surface-100 text-surface-500 dark:bg-surface-800'
            }`}>
              {job.sponsorship_status === 'yes' ? 'Sponsors visa' : job.sponsorship_status === 'no' ? 'No sponsorship' : 'Sponsorship unknown'}
            </span>

            {/* Salary */}
            {job.salary_min && job.salary_max && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400">
                ${Math.round(job.salary_min / 1000)}k – ${Math.round(job.salary_max / 1000)}k
              </span>
            )}

            {/* Ghost indicator */}
            {ghostLabel && (
              <span className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${
                ghostColor === 'red' 
                  ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                  : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
              }`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {ghostLabel}
              </span>
            )}

            {/* Source */}
            <span className="text-xs text-surface-400 ml-auto">
              via {job.source_type}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-surface-100 dark:border-surface-800">
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                saved 
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' 
                  : 'border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800'
              }`}
              data-testid="job-save"
            >
              {saved ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                  </svg>
                  Saved
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                  </svg>
                  {saving ? 'Saving...' : 'Save'}
                </>
              )}
            </button>

            <button
              onClick={() => router.push(`/dashboard/resumes/builder?job=${job.id}`)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-karmio-200 dark:border-karmio-800 text-karmio-600 dark:text-karmio-400 hover:bg-karmio-50 dark:hover:bg-karmio-900/30 transition-all"
              data-testid="job-tailor"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path d="M14 2v6h6M9.663 17h4.673M12 3v1" />
              </svg>
              Tailor resume
            </button>

            <button
              onClick={handleApply}
              disabled={applying || applied}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                applied 
                  ? 'bg-karmio-50 text-karmio-600 dark:bg-karmio-900/30 dark:text-karmio-400' 
                  : 'bg-karmio-500 text-white hover:bg-karmio-600'
              }`}
              data-testid="job-apply"
            >
              {applied ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                  Applied
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                    <path d="M15 3h6v6M10 14L21 3" />
                  </svg>
                  {applying ? 'Opening...' : 'Apply'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
