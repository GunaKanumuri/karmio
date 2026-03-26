'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { CompanyIntel } from '@/components/jobs/CompanyIntel';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { analyzeGhostJob, getGhostLabel, getGhostColor } from '@/lib/jobs/ghost-detector';
import { getTimeSince } from '@/lib/geo/locale-config';
import { ArrowLeft, ExternalLink, Bookmark, BookmarkCheck, Building2, MapPin, Clock, DollarSign, Users, Briefcase, CheckCircle2, AlertTriangle, Loader2, FileText, Share2 } from 'lucide-react';
import type { IJobCardData } from '@/types';

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [job, setJob] = useState<IJobCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showCompanyIntel, setShowCompanyIntel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    if (!id) return;
    fetch(`/api/jobs/${id}`).then(r => r.json()).then(json => {
      if (json.success && json.data) {
        setJob(json.data);
        if (json.data.application?.status === 'applied') setApplied(true);
        if (json.data.application?.status === 'saved') setSaved(true);
      } else { setNotFound(true); }
    }).catch(() => setNotFound(true)).finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (saved || saving || !job) return;
    setSaving(true);
    try {
      const res = await fetch('/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job_id: job.id, status: 'saved' }) });
      const json = await res.json();
      if (json.success || json.error?.code === 'DUPLICATE_APPLICATION') { setSaved(true); showToast('Job saved to your list'); }
      else showToast(json.error?.message || 'Could not save job');
    } catch { showToast('Network error — try again'); }
    setSaving(false);
  };

  const handleApply = async () => {
    if (applied || applying || !job) return;
    setApplying(true);
    try {
      const res = await fetch('/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job_id: job.id, status: 'applied', match_score: job.match_score || 0 }) });
      const json = await res.json();
      if (json.success) { setApplied(true); showToast('Application tracked — opening career page'); }
      else if (json.error?.code === 'DUPLICATE_APPLICATION') { setApplied(true); showToast('Already tracked — opening career page'); }
      else if (json.error?.code === 'TIER_LIMIT_REACHED') { showToast(json.error.message); setApplying(false); return; }
      else showToast('Opening career page (tracking issue)');
    } catch { showToast('Opening career page (offline)'); }
    if (job?.source_url && job.source_url !== '#') window.open(job.source_url, '_blank', 'noopener,noreferrer');
    setApplying(false);
  };

  const handleShare = async () => {
    if (!job) return;
    if (navigator.share) await navigator.share({ title: `${job.title} at ${job.company_name}`, url: job.source_url }).catch(() => {});
    else { await navigator.clipboard.writeText(job.source_url).catch(() => {}); showToast('Link copied to clipboard'); }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-3xl">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-6 transition-colors"><ArrowLeft size={16} />Back to feed</button>
          <div className="space-y-4">{[1, 2, 3].map(i => (<div key={i} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-6 animate-pulse"><div className="h-6 w-2/3 bg-slate-100 dark:bg-slate-800 rounded mb-3" /><div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-800 rounded" /></div>))}</div>
        </div>
      </AppShell>
    );
  }

  if (notFound || !job) {
    return (
      <AppShell>
        <div className="max-w-3xl">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-6 transition-colors"><ArrowLeft size={16} />Back to feed</button>
          <div className="p-12 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4"><Briefcase size={28} className="text-slate-400" /></div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Job not found</h2>
            <p className="text-slate-500 mb-6">This job has likely been filled or taken down.</p>
            <Button onClick={() => router.push('/dashboard/jobs/feed')}>Browse other jobs</Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const ghostAnalysis = analyzeGhostJob(job);
  const ghostLabel = getGhostLabel(ghostAnalysis);
  const ghostColor = getGhostColor(ghostAnalysis);
  const companySlug = job.company_name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const logoDomain = `${job.company_name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
  const requiredSkills: string[] = job.description_parsed?.required_skills?.slice(0, 12) || [];

  return (
    <AppShell>
      <div className="max-w-3xl">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-6 transition-colors"><ArrowLeft size={16} />Back to feed</button>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 mb-4">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center bg-white dark:bg-slate-800 overflow-hidden flex-shrink-0">
              {!logoFailed ? <img src={`https://logo.clearbit.com/${logoDomain}`} alt={job.company_name} width={36} height={36} className="w-9 h-9 object-contain" onError={() => setLogoFailed(true)} /> : <span className="text-2xl font-semibold text-slate-400">{job.company_name.charAt(0).toUpperCase()}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white mb-1 leading-tight">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                <span className="font-medium text-slate-700 dark:text-slate-300">{job.company_name}</span>
                <span className="flex items-center gap-1"><MapPin size={12} />{job.location}{job.remote_type !== 'onsite' && ` · ${job.remote_type}`}</span>
                <span className="flex items-center gap-1"><Clock size={12} />{getTimeSince(job.first_seen_at)}</span>
              </div>
            </div>
            <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center text-center ${job.match_score >= 80 ? 'bg-emerald-50 dark:bg-emerald-900/20' : job.match_score >= 60 ? 'bg-karmio-50 dark:bg-karmio-900/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
              <span className={`text-lg font-bold leading-none ${job.match_score >= 80 ? 'text-emerald-600 dark:text-emerald-400' : job.match_score >= 60 ? 'text-karmio-600 dark:text-karmio-400' : 'text-slate-500'}`}>{job.match_score || 0}</span>
              <span className="text-[10px] text-slate-400">match</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${job.sponsorship_status === 'yes' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : job.sponsorship_status === 'no' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'}`}>
              {job.sponsorship_status === 'yes' ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
              {job.sponsorship_status === 'yes' ? 'Sponsors visa' : job.sponsorship_status === 'no' ? 'No sponsorship' : 'Sponsorship unclear'}
            </span>
            {job.salary_min && job.salary_max && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"><DollarSign size={11} />${Math.round(job.salary_min / 1000)}k – ${Math.round(job.salary_max / 1000)}k</span>}
            {job.experience_years_min !== null && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"><Users size={11} />{job.experience_years_min}{job.experience_years_max ? `–${job.experience_years_max}` : '+'} yrs exp</span>}
            {ghostLabel && <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${ghostColor === 'red' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'}`}><AlertTriangle size={11} />{ghostLabel}</span>}
            <span className="ml-auto text-xs text-slate-400 self-center">via {job.source_type}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pb-5 mb-5 border-b border-slate-100 dark:border-slate-800">
            <button onClick={handleApply} disabled={applying} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${applied ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-karmio-500 text-white hover:bg-karmio-600 shadow-sm'}`}>
              {applying ? <><Loader2 size={15} className="animate-spin" />Opening...</> : applied ? <><CheckCircle2 size={15} />Applied</> : <><ExternalLink size={15} />Apply now</>}
            </button>
            <button onClick={() => router.push(`/dashboard/resumes/builder?job=${job.id}`)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-karmio-200 dark:border-karmio-800 text-karmio-600 dark:text-karmio-400 hover:bg-karmio-50 dark:hover:bg-karmio-900/20 transition-all">
              <FileText size={15} />Tailor resume
            </button>
            <button onClick={handleSave} disabled={saving} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${saved ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}{saved ? 'Saved' : saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setShowCompanyIntel(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
              <Building2 size={15} />Company intel
            </button>
            <button onClick={handleShare} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all ml-auto" title="Share job">
              <Share2 size={15} />
            </button>
          </div>

          {requiredSkills.length > 0 && (
            <div className="mb-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Skills mentioned</h3>
              <div className="flex flex-wrap gap-1.5">
                {requiredSkills.map(skill => <span key={skill} className="px-2.5 py-1 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">{skill}</span>)}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Job description</h3>
            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{job.description_raw}</pre>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">Ready to apply?</p>
            <p className="text-xs text-slate-500 mt-0.5">Opens the official career page at {job.company_name}.</p>
          </div>
          <button onClick={handleApply} disabled={applying} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex-shrink-0 ${applied ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800' : 'bg-karmio-500 text-white hover:bg-karmio-600 shadow-sm'}`}>
            {applied ? <><CheckCircle2 size={15} />Applied</> : <><ExternalLink size={15} />Apply at {job.company_name}</>}
          </button>
        </div>
      </div>

      <Modal open={showCompanyIntel} onClose={() => setShowCompanyIntel(false)} title={`${job.company_name} — Company Intel`}>
        <CompanyIntel companyName={job.company_name} companySlug={companySlug} careerUrl={job.ats_board_url || job.source_url} sourceType={job.source_type} location={job.location} />
      </Modal>

      {toast && <div className="fixed bottom-6 right-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg z-50 animate-fade-in">{toast}</div>}
    </AppShell>
  );
}