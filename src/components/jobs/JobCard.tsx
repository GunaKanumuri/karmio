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
import { getTimeSince } from '@/lib/geo/locale-config';
import {
  Bookmark, BookmarkCheck, ExternalLink, FileText,
  Building2, Loader2, CheckCircle2, AlertCircle, ArrowRight,
} from 'lucide-react';

interface JobCardProps {
  job: IJobCardData;
  onStatusChange?: () => void;
}

export function JobCard({ job, onStatusChange }: JobCardProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showIntel, setShowIntel] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const isLowMatch = job.match_score < 40;
  const sponsorBadge = job.sponsorship_status === 'yes' ? 'success'
    : job.sponsorship_status === 'no' ? 'danger' : 'warning';
  const sponsorLabel = job.sponsorship_status === 'yes' ? 'Sponsors visa'
    : job.sponsorship_status === 'no' ? 'No sponsorship' : 'Visa status unknown';

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ─── SAVE ────────────────────────────────────────────────────────────────────
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

  // ─── APPLY ───────────────────────────────────────────────────────────────────
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

  // ─── Logo ─────────────────────────────────────────────────────────────────────
  const [logoFailed, setLogoFailed] = useState(false);
  const logoDomain = `${job.company_name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
  const companySlug = job.company_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  return (
    <>
      <Card hoverable className={isLowMatch ? 'opacity-75' : ''}>
        {/* Clickable header → job detail page */}
        <Link href={`/dashboard/jobs/${job.id}`} className="block">
          <div className="flex justify-between items-start gap-3">
            <div className="flex gap-3 items-center min-w-0">
              {/* Company logo */}
              <div className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm font-medium text-slate-500 dark:text-slate-400 flex-shrink-0 bg-white dark:bg-slate-900 overflow-hidden">
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
                <h3 className="text-sm font-medium text-slate-900 dark:text-white truncate hover:text-karmio-600 dark:hover:text-karmio-400 transition-colors">
                  {job.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {job.company_name} — {job.location}
                  {job.remote_type !== 'onsite' && ` (${job.remote_type})`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <MatchRing score={job.match_score} />
              <ArrowRight size={14} className="text-slate-300 dark:text-slate-600" />
            </div>
          </div>

          {/* Description snippet */}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 line-clamp-2 leading-relaxed">
            {job.description_raw?.slice(0, 200)}...
          </p>
        </Link>

        {/* Badges */}
        <div className="flex gap-1.5 flex-wrap items-center mt-3">
          <Badge variant={sponsorBadge}>{sponsorLabel}</Badge>
          <Badge>{getTimeSince(job.first_seen_at)}</Badge>
          {job.matched_profile && <Badge variant="purple">{job.matched_profile}</Badge>}
          {job.salary_min && job.salary_max && (
            <Badge variant="info">
              {job.salary_currency === 'INR'
                ? `₹${(job.salary_min / 100000).toFixed(1)}–${(job.salary_max / 100000).toFixed(1)} LPA`
                : `$${Math.round(job.salary_min / 1000)}k–$${Math.round(job.salary_max / 1000)}k`
              }
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
        <div className="flex gap-2 mt-3 flex-wrap">
          <Button variant="primary" size="sm" onClick={() => router.push(`/dashboard/resumes/builder?job=${job.id}`)}>
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
      </Card>

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

// ─── Domain guesser for Clearbit ────────────────────────────────────────────
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