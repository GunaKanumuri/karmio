'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Building2, Users, Globe, Briefcase, MapPin,
  TrendingUp, ExternalLink, Loader2, AlertCircle,
  CheckCircle, XCircle, HelpCircle,
} from 'lucide-react';

interface CompanyDetails {
  company_slug: string;
  company_name: string;
  company_domain: string | null;
  ats_type: string | null;
  career_page_url: string;
  ats_board_url: string | null;
  open_roles_count: number;
  open_roles_eng: number | null;
  sponsorship_signal: 'yes' | 'no' | 'unknown';
  sponsorship_notes: string | null;
  company_size: string | null;
  industry: string | null;
  hq_location: string | null;
  country: string;
  last_fetched_at: string | null;
  _derived?: boolean;
}

interface CompanyIntelProps {
  companyName: string;
  companySlug?: string;
  careerUrl?: string;           // fallback if API fails
  sourceType: string;
  location?: string;
}

// Derive slug from company name — matches the seed logic
function toSlug(name: string): string {
  return name.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function CompanyIntel({ companyName, companySlug, careerUrl, sourceType, location }: CompanyIntelProps) {
  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const slug = companySlug || toSlug(companyName);

    fetch(`/api/companies?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(json => {
        if (cancelled) return;
        if (json.success && json.data) {
          setCompany(json.data);
        } else {
          // Fallback: try by name
          return fetch(`/api/companies?name=${encodeURIComponent(companyName)}`)
            .then(r => r.json())
            .then(json2 => {
              if (!cancelled) {
                if (json2.success && json2.data) {
                  setCompany(json2.data);
                } else {
                  setError('Company details not available yet.');
                }
              }
            });
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load company details.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [companyName, companySlug]);

  // ─── Logo ────────────────────────────────────────────────────────────────────
  const [logoFailed, setLogoFailed] = useState(false);
  const logoDomain = company?.company_domain || `${toSlug(companyName).replace(/-/g, '')}.com`;
  const logoUrl = `https://logo.clearbit.com/${logoDomain}`;

  // ─── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="py-10 text-center">
        <Loader2 size={24} className="animate-spin mx-auto mb-2 text-karmio-500" />
        <p className="text-sm text-slate-500">Loading company details...</p>
      </div>
    );
  }

  // ─── Error state — fallback to minimal card ──────────────────────────────────
  if (error || !company) {
    return (
      <Card padding="md">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg font-semibold text-slate-500">
            {companyName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{companyName}</h3>
            <p className="text-xs text-slate-500">{location || 'Location not specified'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 mb-3">
          <Globe size={14} className="text-slate-400 flex-shrink-0" />
          <span>ATS source: {sourceType}</span>
        </div>

        {careerUrl && (
          <a
            href={careerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-karmio-500 hover:text-karmio-600 font-medium"
          >
            <ExternalLink size={14} />
            View career page
          </a>
        )}

        {error && (
          <div className="mt-3 flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2.5">
            <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
            <span>Detailed company data will be available after the next job fetch cycle.</span>
          </div>
        )}
      </Card>
    );
  }

  // ─── Sponsorship badge ────────────────────────────────────────────────────────
  const SponsorIcon = company.sponsorship_signal === 'yes' ? CheckCircle
    : company.sponsorship_signal === 'no' ? XCircle
      : HelpCircle;
  const sponsorVariant = company.sponsorship_signal === 'yes' ? 'success'
    : company.sponsorship_signal === 'no' ? 'danger' : 'warning';
  const sponsorLabel = company.sponsorship_signal === 'yes' ? 'Sponsors visas'
    : company.sponsorship_signal === 'no' ? 'No sponsorship'
      : 'Sponsorship unknown';

  // ─── Last updated ─────────────────────────────────────────────────────────────
  const lastUpdated = company.last_fetched_at
    ? timeSince(company.last_fetched_at)
    : null;

  return (
    <Card padding="md">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center bg-white dark:bg-slate-900 overflow-hidden flex-shrink-0">
          {!logoFailed ? (
            <img
              src={logoUrl}
              alt={company.company_name}
              width={32}
              height={32}
              className="w-8 h-8 object-contain"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span className="text-lg font-semibold text-slate-400">
              {company.company_name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{company.company_name}</h3>
          <p className="text-xs text-slate-500">{company.hq_location || location || 'Location not specified'}</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Open roles */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Briefcase size={13} className="text-slate-400" />
            <span className="text-xs text-slate-500">Open roles</span>
          </div>
          <p className="text-lg font-semibold text-slate-900 dark:text-white leading-none">
            {company.open_roles_count}
          </p>
          {company.open_roles_eng !== null && company.open_roles_eng > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">{company.open_roles_eng} in engineering</p>
          )}
          {company.open_roles_count > 20 && (
            <div className="mt-1">
              <Badge variant="success" className="text-[10px] px-1.5 py-0">Actively hiring</Badge>
            </div>
          )}
        </div>

        {/* Company size */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Users size={13} className="text-slate-400" />
            <span className="text-xs text-slate-500">Company size</span>
          </div>
          {company.company_size ? (
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{company.company_size} employees</p>
          ) : (
            <p className="text-xs text-slate-400 mt-1">Not available</p>
          )}
          {company.industry && (
            <p className="text-xs text-slate-400 mt-0.5">{company.industry}</p>
          )}
        </div>
      </div>

      {/* Sponsorship */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <SponsorIcon size={14} className={
              company.sponsorship_signal === 'yes' ? 'text-emerald-500' :
              company.sponsorship_signal === 'no' ? 'text-red-500' : 'text-amber-500'
            } />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Visa sponsorship</span>
          </div>
          <Badge variant={sponsorVariant}>{sponsorLabel}</Badge>
        </div>
        {company.sponsorship_notes && (
          <p className="text-xs text-slate-500 leading-relaxed">{company.sponsorship_notes}</p>
        )}
      </div>

      {/* Career page links */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <Globe size={14} className="text-slate-400 flex-shrink-0" />
          <span>ATS: {company.ats_type || sourceType}</span>
          {company._derived && (
            <span className="ml-auto text-xs text-slate-400">(live data)</span>
          )}
        </div>

        {company.career_page_url && (
          <a
            href={company.career_page_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-karmio-500 hover:text-karmio-600 font-medium transition-colors"
          >
            <ExternalLink size={13} />
            View careers page
          </a>
        )}

        {company.ats_board_url && company.ats_board_url !== company.career_page_url && (
          <a
            href={company.ats_board_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <TrendingUp size={12} />
            Browse all open roles on {company.ats_type || 'ATS'}
          </a>
        )}
      </div>

      {/* Footer disclaimer */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5">
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Data sourced from {company.ats_type || sourceType} career boards.
          {lastUpdated ? ` Last refreshed ${lastUpdated}.` : ''}
          {' '}Sponsorship signals are inferred from job descriptions — verify on the individual listing before applying.
        </p>
      </div>
    </Card>
  );
}

// ─── Time helper ─────────────────────────────────────────────────────────────
function timeSince(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}