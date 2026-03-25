'use client';

import { useState } from 'react';
import { IJobCardData } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge, MatchRing } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { QualityGate } from '@/components/shared/Helpers';
import { CompanyIntel } from '@/components/jobs/CompanyIntel';
import { getTimeSince } from '@/lib/geo/locale-config';
import { Bookmark, BookmarkCheck, ExternalLink, FileText, Building2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface JobCardProps {
  job: IJobCardData;
  onStatusChange?: () => void; // callback to refresh parent data after apply/save
}

export function JobCard({ job, onStatusChange }: JobCardProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showIntel, setShowIntel] = useState(false);
  const [showResume, setShowResume] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeData, setResumeData] = useState<any>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const isLowMatch = job.match_score < 40;
  const sponsorBadge = job.sponsorship_status === 'yes' ? 'success'
    : job.sponsorship_status === 'no' ? 'danger' : 'warning';
  const sponsorLabel = job.sponsorship_status === 'yes' ? 'Sponsors H1B'
    : job.sponsorship_status === 'no' ? 'No sponsorship' : 'Sponsorship unknown';

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ─── SAVE ───
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
      if (json.success) {
        setSaved(true);
        showToast('Job saved to your list');
        onStatusChange?.();
      } else if (json.error?.code === 'DUPLICATE_APPLICATION') {
        setSaved(true);
        showToast('Already in your list');
      } else {
        showToast(json.error?.message || 'Could not save');
      }
    } catch {
      showToast('Network error — try again');
    }
    setSaving(false);
  };

  // ─── APPLY ───
  const handleApply = async () => {
    if (applied || applying) return;
    setApplying(true);

    // 1) Create the application record first
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: job.id,
          status: 'applied',
          match_score: job.match_score || 0,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setApplied(true);
        showToast('Application tracked — opening career page');
        onStatusChange?.();
      } else if (json.error?.code === 'DUPLICATE_APPLICATION') {
        setApplied(true);
        showToast('Already applied — opening career page');
      } else if (json.error?.code === 'TIER_LIMIT_REACHED') {
        showToast(json.error.message);
        setApplying(false);
        return; // Don't open URL if limit reached
      } else {
        // Still open the URL even if tracking failed
        showToast('Tracking failed, but opening career page');
      }
    } catch {
      showToast('Opening career page (tracking offline)');
    }

    // 2) Open the career page in a new tab
    if (job.source_url && job.source_url !== '#') {
      window.open(job.source_url, '_blank', 'noopener,noreferrer');
    }
    setApplying(false);
  };

  // ─── RESUME GENERATION ───
  const handleViewResume = async () => {
    setShowResume(true);
    if (resumeData) return; // Already generated

    setResumeLoading(true);
    setResumeError(null);
    try {
      const res = await fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: job.id,
          action: 'generate',
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setResumeData(json.data);
      } else {
        setResumeError(json.error?.message || 'Could not generate resume. Please try again.');
      }
    } catch {
      setResumeError('Network error — please check your connection and try again.');
    }
    setResumeLoading(false);
  };

  const retryResume = () => {
    setResumeData(null);
    setResumeError(null);
    handleViewResume();
  };

  // Derive logo URL from company domain via Clearbit
  const companyDomain = guessCompanyDomain(job.company_name);
  const logoUrl = companyDomain ? `https://logo.clearbit.com/${companyDomain}` : null;
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <>
      <Card hoverable className={isLowMatch ? 'opacity-75' : ''}>
        <div className="flex justify-between items-start gap-3">
          <div className="flex gap-3 items-center min-w-0">
            <div className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm font-medium text-slate-500 dark:text-slate-400 flex-shrink-0 bg-white dark:bg-slate-900 overflow-hidden">
              {logoUrl && !logoFailed ? (
                <img
                  src={logoUrl}
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
              <h3 className="text-sm font-medium text-slate-900 dark:text-white truncate">{job.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {job.company_name} — {job.location} {job.remote_type !== 'onsite' && `(${job.remote_type})`}
              </p>
            </div>
          </div>
          <MatchRing score={job.match_score} />
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 line-clamp-2 leading-relaxed">
          {job.description_raw?.slice(0, 200)}...
        </p>

        <div className="flex gap-1.5 flex-wrap items-center mt-3">
          <Badge variant={sponsorBadge}>{sponsorLabel}</Badge>
          <Badge>{getTimeSince(job.first_seen_at)}</Badge>
          {job.matched_profile && <Badge variant="purple">{job.matched_profile}</Badge>}
          {job.salary_min && job.salary_max && (
            <Badge variant="info">
              ${Math.round(job.salary_min / 1000)}k–${Math.round(job.salary_max / 1000)}k
            </Badge>
          )}
          <span className="ml-auto text-[11px] text-slate-400">
            Source: {job.source_type} (verified)
          </span>
        </div>

        {isLowMatch && (
          <QualityGate
            message={`This role may be a stretch — match score is ${job.match_score}%. Review carefully or check better-fit alternatives.`}
            alternatives={3}
          />
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mt-3 flex-wrap">
          <Button variant="primary" size="sm" onClick={handleViewResume}>
            <FileText size={13} className="mr-1" />
            View tailored resume
          </Button>
          <Button size="sm" onClick={() => setShowIntel(true)}>
            <Building2 size={13} className="mr-1" />
            Company intel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || saved}>
            {saved ? <BookmarkCheck size={13} className="mr-1 text-emerald-500" /> : <Bookmark size={13} className="mr-1" />}
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
          </Button>
          <div className="ml-auto">
            <Button size="sm" onClick={handleApply} loading={applying} disabled={applied}>
              {applied ? (
                <><CheckCircle2 size={13} className="mr-1 text-emerald-500" />Applied</>
              ) : (
                <><ExternalLink size={13} className="mr-1" />Apply now</>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* ─── COMPANY INTEL MODAL ─── */}
      <Modal open={showIntel} onClose={() => setShowIntel(false)} title={`${job.company_name} — Company Intel`}>
        <CompanyIntel
          companyName={job.company_name}
          careerUrl={job.source_url !== '#' ? job.source_url : undefined}
          sponsorshipHistory={job.sponsorship_status === 'yes' ? true : job.sponsorship_status === 'no' ? false : undefined}
          sourceType={job.source_type}
          location={job.location}
        />
      </Modal>

      {/* ─── RESUME GENERATION MODAL ─── */}
      <Modal open={showResume} onClose={() => setShowResume(false)} title={`Tailored resume — ${job.company_name}`} size="lg">
        {resumeLoading ? (
          <div className="py-12 text-center">
            <Loader2 size={28} className="animate-spin mx-auto mb-3 text-karmio-500" />
            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">Generating your tailored resume...</p>
            <p className="text-xs text-slate-400 mt-1">Matching your skills to the job requirements</p>
          </div>
        ) : resumeError ? (
          <div className="py-8 text-center">
            <AlertCircle size={28} className="mx-auto mb-3 text-amber-500" />
            <p className="text-sm text-slate-600 dark:text-slate-300">{resumeError}</p>
            <Button variant="primary" size="sm" className="mt-4" onClick={retryResume}>Try again</Button>
          </div>
        ) : resumeData ? (
          <div className="space-y-4">
            {/* Match summary */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Match score</p>
                <Badge variant={resumeData.match_score >= 70 ? 'success' : resumeData.match_score >= 50 ? 'info' : 'warning'}>
                  {resumeData.match_score || job.match_score}%
                </Badge>
              </div>

              {/* Keywords */}
              {resumeData.keywords_matched?.length > 0 && (
                <div className="mb-2">
                  <p className="text-[11px] text-slate-500 mb-1">Matched keywords</p>
                  <div className="flex gap-1 flex-wrap">
                    {resumeData.keywords_matched.map((kw: string) => (
                      <span key={kw} className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] rounded-full">{kw}</span>
                    ))}
                  </div>
                </div>
              )}
              {resumeData.keywords_missing?.length > 0 && (
                <div>
                  <p className="text-[11px] text-slate-500 mb-1">Missing keywords (consider adding)</p>
                  <div className="flex gap-1 flex-wrap">
                    {resumeData.keywords_missing.map((kw: string) => (
                      <span key={kw} className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] rounded-full">{kw}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced summary */}
            {resumeData.enhanced_summary && (
              <div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">AI-tailored summary</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                  {resumeData.enhanced_summary}
                </p>
              </div>
            )}

            {/* Enhanced bullets */}
            {resumeData.enhanced_bullets && Object.keys(resumeData.enhanced_bullets).length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Tailored experience bullets</p>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
                  {Object.entries(resumeData.enhanced_bullets).map(([expId, bullets]: [string, any]) => (
                    <div key={expId}>
                      {Array.isArray(bullets) && bullets.map((bullet: string, i: number) => (
                        <p key={i} className="text-xs text-slate-600 dark:text-slate-400 pl-3 relative before:absolute before:left-0 before:top-[6px] before:w-1 before:h-1 before:rounded-full before:bg-karmio-400 mb-1">
                          {bullet}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button variant="primary" size="sm" onClick={handleApply} disabled={applied}>
                {applied ? 'Already applied' : 'Apply with this resume'}
              </Button>
              {resumeData.cover_letter_text && (
                <Button size="sm" variant="ghost">View cover letter</Button>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-slate-400">
            Loading...
          </div>
        )}
      </Modal>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </>
  );
}

// ─── Domain guesser for Clearbit logos ───
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
  'anduril': 'anduril.com', 'google': 'google.com', 'meta': 'meta.com',
  'apple': 'apple.com', 'amazon': 'amazon.com', 'microsoft': 'microsoft.com',
};

function guessCompanyDomain(companyName: string): string | null {
  const lower = companyName.toLowerCase().trim();
  if (DOMAIN_OVERRIDES[lower]) return DOMAIN_OVERRIDES[lower];
  // Simple heuristic: company-name.com
  const slug = lower.replace(/[^a-z0-9]/g, '');
  if (slug.length < 2) return null;
  return `${slug}.com`;
}

