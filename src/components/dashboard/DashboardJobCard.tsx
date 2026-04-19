'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge, MatchRing } from '@/components/ui/Badge';
import { analyzeGhostJob, getGhostLabel } from '@/lib/jobs/ghost-detector';
import { IJobCardData } from '@/types';
import { Bookmark, FileText, ExternalLink } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTimeLabel(firstSeenAt: string): string {
  const hours = Math.floor((Date.now() - new Date(firstSeenAt).getTime()) / 3_600_000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function CompanyLogo({ companyName }: { companyName: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const initial = companyName.charAt(0).toUpperCase();

  return (
    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
      {imgFailed ? (
        <span className="text-xs font-bold text-slate-400">{initial}</span>
      ) : (
        <img
          src={`https://logo.clearbit.com/${slug}.com`}
          alt=""
          className="w-full h-full object-contain p-1"
          onError={() => setImgFailed(true)}
        />
      )}
    </div>
  );
}

// ─── DashboardJobCard ─────────────────────────────────────────────────────────

interface DashboardJobCardProps {
  job: IJobCardData;
}

export function DashboardJobCard({ job }: DashboardJobCardProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const ghostAnalysis = analyzeGhostJob(job);
  const ghostLabel = getGhostLabel(ghostAnalysis);
  const timeLabel = getTimeLabel(job.first_seen_at);
  const matchScore = (job as any).match_score ?? 0;

  // Navigate to job detail page
  function openJobDetail() {
    router.push(`/dashboard/jobs/${job.id}`);
  }

  // Open the original job posting in a new tab
  function handleApply() {
    const url = job.source_url || (job as any).ats_board_url;
    if (url) window.open(url, '_blank');
  }

  // Save the job to the user's pipeline
  async function handleSave() {
    if (saved || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id, status: 'saved' }),
      });
      const json = await res.json();
      if (json.success) setSaved(true);
    } catch {
      // Silent failure — user can try again
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 transition-all group">
      <div className="flex items-start gap-3">
        <CompanyLogo companyName={job.company_name} />

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3
                onClick={openJobDetail}
                className="text-sm font-semibold text-slate-900 dark:text-white leading-tight group-hover:text-karmio-600 cursor-pointer truncate"
              >
                {job.title}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                {job.company_name} · {job.location}
                {job.remote_type === 'remote' && (
                  <span className="text-emerald-500 ml-1">(Remote)</span>
                )}
              </p>
            </div>
            {matchScore > 0 && <MatchRing score={matchScore} size={32} />}
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {ghostLabel !== 'Verified' && (
              <Badge variant={ghostAnalysis.ghostScore >= 50 ? 'warning' : 'default'}>
                {ghostLabel}
              </Badge>
            )}
            <span className="text-[9px] text-slate-400">{timeLabel}</span>
            {job.salary_min && job.salary_max && (
              <span className="text-[9px] text-slate-500">
                ${Math.round(job.salary_min / 1000)}k–${Math.round(job.salary_max / 1000)}k
              </span>
            )}
          </div>

          {/* Actions row */}
          <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleSave}
              disabled={saved || saving}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium border transition-all ${
                saved
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Bookmark size={11} className={saved ? 'fill-current' : ''} />
              {saved ? 'Saved' : 'Save'}
            </button>

            <button
              onClick={() => router.push(`/dashboard/resumes/builder?job=${job.id}`)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium border border-karmio-200 dark:border-karmio-800 text-karmio-600 hover:bg-karmio-50 transition-all"
            >
              <FileText size={11} />
              Tailor
            </button>

            <button
              onClick={handleApply}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium bg-karmio-500 text-white hover:bg-karmio-600 transition-all ml-auto"
            >
              <ExternalLink size={11} />
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
