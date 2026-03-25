'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { JobCard } from '@/components/jobs/JobCard';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { WhyHelper, Skeleton } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import { IJobCardData } from '@/types';
import Link from 'next/link';

export default function JobFeedPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<IJobCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ posted_within: '7d', sponsorship: '', remote_type: '' });

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
  }, [filters, search]);

  useEffect(() => {
    if (user) fetchJobs();
  }, [user, fetchJobs]);

  // Client-side filter for search (complements server-side)
  const filteredJobs = jobs.filter(j => {
    if (search && !j.title.toLowerCase().includes(search.toLowerCase()) && !j.company_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AppShell>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-medium text-slate-900 dark:text-white">
            Job feed {!loading && <Badge variant="info">{filteredJobs.length} jobs</Badge>}
          </h1>
        </div>

        <WhyHelper className="mb-4">
          Every job here is verified from company career pages. Green badges mean the company sponsors visas.
          Jobs are sorted by match score — your best fits appear first.
        </WhyHelper>

        {/* Filters */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Input placeholder="Search jobs or companies..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select options={[
            { value: '1h', label: 'Last hour' }, { value: '4h', label: 'Last 4 hours' },
            { value: '1d', label: 'Last 24 hours' }, { value: '2d', label: 'Last 2 days' },
            { value: '7d', label: 'Last 7 days' },
          ]} value={filters.posted_within} onChange={e => setFilters({ ...filters, posted_within: e.target.value })} />
          <Select options={[
            { value: '', label: 'All sponsorship' }, { value: 'yes', label: 'Sponsors' },
            { value: 'unknown', label: 'Unknown' }, { value: 'no', label: 'No sponsorship' },
          ]} value={filters.sponsorship} onChange={e => setFilters({ ...filters, sponsorship: e.target.value })} />
          <Select options={[
            { value: '', label: 'All locations' }, { value: 'remote', label: 'Remote' },
            { value: 'hybrid', label: 'Hybrid' }, { value: 'onsite', label: 'On-site' },
          ]} value={filters.remote_type} onChange={e => setFilters({ ...filters, remote_type: e.target.value })} />
        </div>

        {/* Job list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4">
                <Skeleton lines={3} />
              </div>
            ))}
          </div>
        ) : filteredJobs.length > 0 ? (
          <div className="space-y-3">
            {filteredJobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                onStatusChange={fetchJobs}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-12 text-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 text-slate-300">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <p className="text-sm text-slate-500">No jobs match your current filters</p>
            <p className="text-xs text-slate-400 mt-1">Try broadening your search or adjusting filters.</p>
            {!(user as any)?.target_profiles?.length && (
              <Link href="/dashboard/resumes/profile" className="inline-block mt-3">
                <Button variant="primary" size="sm">Set up your profile first</Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
