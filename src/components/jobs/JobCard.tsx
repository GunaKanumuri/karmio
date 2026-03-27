'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IJobCardData } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge, MatchRing } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { QualityGate } from '@/components/shared/Helpers';
import { CompanyIntel } from '@/components/jobs/CompanyIntel';
import { analyzeGhostJob, getGhostLabel, getGhostColor } from '@/lib/jobs/ghost-detector';
import { getTimeSince, getHoursSince } from '@/lib/geo/locale-config';
import {
  Bookmark, BookmarkCheck, ExternalLink, FileText,
  Building2, Loader2, CheckCircle2, AlertCircle, ArrowRight,
  ChevronDown, ChevronUp, Sparkles, Zap, Clock, Users,
  TrendingUp, AlertTriangle,
} from 'lucide-react';

export interface JobCardProps {
  job: IJobCardData;
  isSaved?: boolean;
  isApplied?: boolean;
  applicationStatus?: string;
  onStatusChange?: () => void;
}

// ─── Inline Tailor Resume Panel ──────────────────────────────────────────────
function TailorPanel({ job, onClose }: { job: IJobCardData; onClose: () => void }) {
  const router = useRouter();
  const skills = job.description_parsed?.required_skills || [];
  const matched = skills.slice(0, 3);
  const missing = skills.slice(3, 6);

  return (
    <div className="mt-3 p-4 rounded-xl bg-karmio-50 dark:bg-karmio-900/20 border border-karmio-200 dark:border-karmio-800 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-karmio-700 dark:text-karmio-300">
          <Sparkles size={14} />
          Resume Optimization Suggestions
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <ChevronUp size={14} />
        </button>
      </div>

      <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
        {matched.length > 0 && (
          <div className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
            <span>
              Add keywords: <span className="font-medium text-slate-900 dark:text-white">{matched.join(', ')}</span>
            </span>
          </div>
        )}
        {missing.length > 0 && (
          <div className="flex items-start gap-2">
            <TrendingUp size={14} className="text-karmio-500 mt-0.5 flex-shrink-0" />
            <span>
              Highlight experience with: <span className="font-medium text-slate-900 dark:text-white">{missing.join(', ')}</span>
            </span>
          </div>
        )}
        <div className="flex items-start gap-2">
          <Zap size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <span>
            Match could improve to{' '}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {Math.min((job.match_score || 0) + 5, 99)}%
            </span>{' '}
            with these changes
          </span>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Button variant="primary" size="sm" onClick={() => router.push(`/dashboard/resumes/builder?job=${job.id}`)}>
          <Zap size={12} className="mr-1" />
          Auto-Tailor & Download
        </Button>
        <Button size="sm" onClick={() => router.push(`/dashboard/resumes/builder?job=${job.id}&preview=1`)}>
          <FileText size={12} className="mr-1" />
          Preview Changes
        </Button>
      </div>
    </div>
  );
}

// ─── Match Detail Expand Panel ───────────────────────────────────────────────
function MatchDetailPanel({ job }: { job: IJobCardData }) {
  const router = useRouter();
  const skills = job.description_parsed?.required_skills || [];
  const matched = skills.slice(0, 4);
  const toHighlight = skills.slice(4, 7);

  return (
    <div className="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 animate-fade-in">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white mb-3">
        <TrendingUp size={14} className="text-karmio-500" />
        Match Breakdown — {job.title} at {job.company_name}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {matched.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
              <CheckCircle2 size={12} />
              Skills that match
            </div>
            <div className="flex flex-wrap gap-1.5">
              {matched.map(skill => (
                <span key={skill} className="px-2 py-0.5 rounded-md text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {toHighlight.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2">
              <AlertCircle size={12} />
              Skills to highlight
            </div>
            <div className="flex flex-wrap gap-1.5">
              {toHighlight.map(skill => (
                <span key={skill} className="px-2 py-0.5 rounded-md text-xs bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3">
        <Button variant="primary" size="sm" onClick={() => router.push(`/dashboard/resumes/builder?job=${job.id}`)}>
          <FileText size={12} className="mr-1" />
          Tailor my resume for this role
        </Button>
      </div>
    </div>
  );
}

// ─── Main JobCard ────────────────────────────────────────────────────────────
export function JobCard({ job, isSaved: isSavedProp, isApplied: isAppliedProp, applicationStatus, onStatusChange }: JobCardProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showIntel, setShowIntel] = useState(false);
  const [showTailor, setShowTailor] = useState(false);
  const [showMatchDetail, setShowMatchDetail] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const isLowMatch = job.match_score < 40;
  const ghostAnalysis = analyzeGhostJob(job);
  const ghostLabel = getGhostLabel(ghostAnalysis);
  const ghostColor = getGhostColor(ghostAnalysis);
  const sponsorBadge = job.sponsorship_status === 'yes' ? 'success'
    : job.sponsorship_status === 'no' ? 'danger' : 'warning';
  const sponsorLabel = job.sponsorship_status === 'yes' ? 'Sponsors visa'
    : job.sponsorship_status === 'no' ? 'No sponsorship' : 'Visa status unknown';

  // Time-based badges
  const hoursSincePosted = getHoursSince(job.first_seen_at);
  const isJustPosted = hoursSincePosted <= 6;
  const isEarlyApplicant = job.realness_score >= 70 && hoursSincePosted <= 24;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ─── SAVE ──────────────────────────────────────────────────────────────────
  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
        showToast('Job saved');
        onStatusChange?.();
      } else {
        showToast(json.error?.message || 'Could not save');
      }
    } catch {
      showToast('Network error — try again');
    }
    setSaving(false);
  };

  // ─── APPLY ─────────────────────────────────────────────────────────────────
  const handleApply = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (applied || applying) return;
    setApplying(true);

    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id, status: 'applied', match_score: job.match_score || 0 }),
      });
      const json = await res.json();
      if (json.success) {
        setApplied(true);
        showToast('Tracked — opening career page');
        onStatusChange?.();
      } else if (json.error?.code === 'DUPLICATE_APPLICATION') {
        setApplied(true);
        showToast('Already applied — opening career page');
      } else if (json.error?.code === 'TIER_LIMIT_REACHED') {
        showToast(json.error.message);
        setApplying(false);
        return;
      } else {
        showToast('Opening career page');
      }
    } catch {
      showToast('Opening career page (offline)');
    }

    if (job.source_url && job.source_url !== '#') {
      window.open(job.source_url, '_blank', 'noopener,noreferrer');
    }
    setApplying(false);
  };

  // ─── Logo ──────────────────────────────────────────────────────────────────
  const [logoFailed, setLogoFailed] = useState(false);
  const logoDomain = `${job.company_name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
  const companySlug = job.company_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  return (
    <>
      <div className={`bg-white dark:bg-slate-900 border rounded-xl transition-all hover:border-karmio-300 dark:hover:border-karmio-700 hover:shadow-sm ${
        ghostAnalysis.ghostScore >= 30
          ? 'border-amber-200 dark:border-amber-800/50'
          : isLowMatch
          ? 'border-slate-200 dark:border-slate-700/50 opacity-75'
          : 'border-slate-200 dark:border-slate-700/50'
      }`}>
        {/* Clickable header → job detail page */}
        <Link href={`/dashboard/jobs/${job.id}`} className="block p-4">
          <div className="flex justify-between items-start gap-3">
            <div className="flex gap-3 items-start min-w-0">
              {/* Company logo */}
              <div className="w-11 h-11 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm font-medium text-slate-500 dark:text-slate-400 flex-shrink-0 bg-white dark:bg-slate-900 overflow-hidden">
                {!logoFailed ? (
                  <img
                    src={`https://logo.clearbit.com/${logoDomain}`}
                    alt={job.company_name}
                    width={28}
                    height={28}
                    loading="lazy"
                    onError={() => setLogoFailed(true)}
                    className="w-7 h-7 object-contain"
                  />
                ) : (
                  job.company_name.charAt(0).toUpperCase()
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white hover:text-karmio-600 dark:hover:text-karmio-400 transition-colors leading-tight">
                    {job.title}
                  </h3>
                  {isEarlyApplicant && (
                    <Badge variant="success" className="text-[10px] px-1.5 py-0">
                      <Zap size={10} />Early applicant
                    </Badge>
                  )}
                  {isJustPosted && (
                    <Badge variant="brand" className="text-[10px] px-1.5 py-0">
                      <Sparkles size={10} />Just posted
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{job.company_name}</span>
                  {' '}— {job.location}
                  {job.remote_type !== 'onsite' && ` (${job.remote_type})`}
                </p>
              </div>
            </div>

            {/* Match ring — clickable to expand detail */}
            <div
              className="flex items-center gap-2 flex-shrink-0 cursor-pointer group"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMatchDetail(!showMatchDetail); }}
              title="Click for match breakdown"
            >
              <MatchRing score={job.match_score || 0} size={40} showLabel />
            </div>
          </div>

          {/* Description snippet */}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 line-clamp-2 leading-relaxed">
            {job.description_raw?.slice(0, 200)}...
          </p>
        </Link>

        {/* Badges + Actions */}
        <div className="px-4 pb-4">
          {/* Badges */}
          <div className="flex gap-1.5 flex-wrap items-center">
            <Badge variant={sponsorBadge}>{sponsorLabel}</Badge>
            <Badge>
              <Clock size={10} />
              {getTimeSince(job.first_seen_at)}
            </Badge>
            {job.matched_profile && <Badge variant="purple">{job.matched_profile}</Badge>}
            {job.salary_min && job.salary_max && (
              <Badge variant="info">
                ${Math.round(job.salary_min / 1000)}k–${Math.round(job.salary_max / 1000)}k
              </Badge>
            )}
            {ghostLabel && (
              <Badge variant={ghostColor === 'red' ? 'danger' : 'warning'}>
                <AlertTriangle size={10} />
                {ghostLabel}
              </Badge>
            )}
            <span className="ml-auto text-[11px] text-slate-400">via {job.source_type}</span>
          </div>

          {isLowMatch && (
            <QualityGate
              message={`Match score is ${job.match_score}% — this role may be a stretch.`}
              alternatives={3}
            />
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-3 flex-wrap items-center">
            <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); setShowTailor(!showTailor); }}>
              <FileText size={13} className="mr-1" />
              Tailor resume
            </Button>

            <Button size="sm" onClick={(e) => { e.stopPropagation(); setShowIntel(true); }}>
              <Building2 size={13} className="mr-1" />
              Company intel
            </Button>

            <Button size="sm" onClick={handleSave} disabled={saving || saved}>
              {saved
                ? <><BookmarkCheck size={13} className="mr-1 text-emerald-500" />Saved</>
                : <><Bookmark size={13} className="mr-1" />{saving ? 'Saving...' : 'Save'}</>
              }
            </Button>

            <div className="ml-auto">
              <Button size="sm" onClick={handleApply} loading={applying} disabled={applied}>
                {applied
                  ? <><CheckCircle2 size={13} className="mr-1 text-emerald-500" />Applied</>
                  : <><ExternalLink size={13} className="mr-1" />Apply now</>
                }
              </Button>
            </div>
          </div>

          {/* Tailor Resume Panel */}
          {showTailor && (
            <TailorPanel job={job} onClose={() => setShowTailor(false)} />
          )}
        </div>

        {/* Match Detail Panel */}
        {showMatchDetail && <MatchDetailPanel job={job} />}
      </div>

      {/* Company Intel Modal */}
      <Modal
        open={showIntel}
        onClose={() => setShowIntel(false)}
        title={`${job.company_name} — Company Intel`}
      >
        <CompanyIntel
          companyName={job.company_name}
          companySlug={companySlug}
          careerUrl={job.ats_board_url || job.source_url}
          sourceType={job.source_type}
          location={job.location}
        />
      </Modal>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </>
  );
}

// ─── Domain guesser for Clearbit ─────────────────────────────────────────────
const DOMAIN_OVERRIDES: Record<string, string> = {
  'stripe': 'stripe.com', 'airbnb': 'airbnb.com', 'figma': 'figma.com',
  'notion': 'notion.so', 'vercel': 'vercel.com', 'netflix': 'netflix.com',
  'spotify': 'spotify.com', 'coinbase': 'coinbase.com', 'discord': 'discord.com',
  'reddit': 'reddit.com', 'plaid': 'plaid.com', 'datadog': 'datadoghq.com',
  'cloudflare': 'cloudflare.com', 'twilio': 'twilio.com', 'gusto': 'gusto.com',
  'brex': 'brex.com', 'ramp': 'ramp.com', 'airtable': 'airtable.com',
  'databricks': 'databricks.com', 'duolingo': 'duolingo.com', 'snyk': 'snyk.io',
  'retool': 'retool.com', 'dbt labs': 'getdbt.com', 'openai': 'openai.com',
  'anthropic': 'anthropic.com', 'scale ai': 'scale.com', 'hugging face': 'huggingface.co',
  'robinhood': 'robinhood.com', 'lyft': 'lyft.com', 'instacart': 'instacart.com',
  'palantir': 'palantir.com', 'hashicorp': 'hashicorp.com', 'flexport': 'flexport.com',
  'anduril': 'anduril.com',
};

export function guessCompanyDomain(companyName: string): string {
  const lower = companyName.toLowerCase().trim();
  if (DOMAIN_OVERRIDES[lower]) return DOMAIN_OVERRIDES[lower];
  return `${lower.replace(/[^a-z0-9]/g, '')}.com`;
}