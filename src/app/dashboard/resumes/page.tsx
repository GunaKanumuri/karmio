'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import {
  FileText, Download, Pencil, Trash2, Search,
  ArrowRight, Sparkles, Calendar, Building2,
  SortAsc, Filter, MoreHorizontal, Copy, Check,
} from 'lucide-react';
import Link from 'next/link';
import page from '../subscription/page';

interface ResumeRecipe {
  id: string;
  job_id: string;
  match_score: number;
  enhanced_summary: string;
  keywords_matched: string[];
  keywords_missing: string[];
  cover_letter_text: string | null;
  format: string;
  version: number;
  is_archived: boolean;
  created_at: string;
  job_postings?: {
    id: string;
    title: string;
    company_name: string;
    location: string;
  };
}

export default function MyResumesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [recipes, setRecipes] = useState<ResumeRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'company'>('date');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await fetch('/api/resumes');
        const json = await res.json();
        if (json.success) setRecipes(json.data || []);
      } catch {}
      setLoading(false);
    })();
  }, [user]);

  const filtered = useMemo(() => {
    let list = recipes.filter(r => !r.is_archived);

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.job_postings?.company_name?.toLowerCase().includes(q) ||
        r.job_postings?.title?.toLowerCase().includes(q) ||
        r.keywords_matched?.some(k => k.toLowerCase().includes(q))
      );
    }

    if (sortBy === 'score') list.sort((a, b) => b.match_score - a.match_score);
    else if (sortBy === 'company') list.sort((a, b) => (a.job_postings?.company_name || '').localeCompare(b.job_postings?.company_name || ''));
    else list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return list;
  }, [recipes, search, sortBy]);

  const handleDownload = async (recipeId: string, format: 'docx' | 'pdf') => {
    setDownloading(recipeId);
    try {
      const res = await fetch(`/api/resumes/${recipeId}/download?format=${format}`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    }
    setDownloading(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await fetch(`/api/resumes/${deleteId}`, { method: 'DELETE' });
      setRecipes(prev => prev.filter(r => r.id !== deleteId));
    } catch {}
    setDeleting(false);
    setDeleteId(null);
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">My Resumes</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              AI-tailored resumes for each job application.
            </p>
          </div>
          <Link href="/dashboard/jobs/feed">
            <button className="btn btn-primary btn-sm">
              <Sparkles size={14} className="mr-1" /> Tailor new resume
            </button>
          </Link>
        </div>

        {/* Search + Sort */}
        {recipes.length > 0 && (
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by company, job title, or keyword..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-karmio-500/30"
              />
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer">
              <option value="date">Newest first</option>
              <option value="score">Highest match</option>
              <option value="company">Company A-Z</option>
            </select>
          </div>
        )}

        {/* Resume list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5">
                <Skeleton lines={3} />
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map(recipe => (
              <ResumeCard
                key={recipe.id}
                recipe={recipe}
                onEdit={() => router.push(`/dashboard/resumes/builder?job=${recipe.job_id}`)}
                onDownload={(format) => handleDownload(recipe.id, format)}
                onDelete={() => setDeleteId(recipe.id)}
                downloading={downloading === recipe.id}
              />
            ))}
          </div>
        ) : recipes.length > 0 ? (
          <Card padding="lg" className="text-center py-10">
            <Search size={24} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-500">No resumes match your search.</p>
          </Card>
        ) : (
          <Card padding="lg" className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-karmio-50 dark:bg-karmio-900/20 flex items-center justify-center">
              <FileText size={28} className="text-karmio-400" />
            </div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-white mb-2">No resumes yet</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
              Browse jobs and click &quot;Tailor resume&quot; to generate your first AI-optimized resume.
            </p>
            <Link href="/dashboard/jobs/feed">
              <button className="btn btn-primary">
                Browse jobs <ArrowRight size={14} className="ml-1" />
              </button>
            </Link>
          </Card>
        )}

        {/* Stats */}
        {recipes.length > 0 && (
          <p className="text-xs text-slate-400 mt-4 text-center">
            {recipes.filter(r => !r.is_archived).length} resume{recipes.filter(r => !r.is_archived).length !== 1 ? 's' : ''} generated
          </p>
        )}

        {/* Delete confirmation */}
        <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete resume" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              This will permanently delete this tailored resume recipe. You can always generate a new one.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button variant="danger" onClick={handleDelete} loading={deleting}>Delete</Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}

// ─── Resume Card ───
function ResumeCard({ recipe, onEdit, onDownload, onDelete, downloading }: {
  recipe: ResumeRecipe;
  onEdit: () => void;
  onDownload: (format: 'docx' | 'pdf') => void;
  onDelete: () => void;
  downloading: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const company = recipe.job_postings?.company_name || 'Unknown';
  const title = recipe.job_postings?.title || 'Unknown role';
  const location = recipe.job_postings?.location || '';
  const date = new Date(recipe.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const companyInitial = company.charAt(0).toUpperCase();
  const logoUrl = `https://logo.clearbit.com/${company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;

  const handleCopySummary = () => {
    navigator.clipboard.writeText(recipe.enhanced_summary || '');
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 hover:border-slate-300 dark:hover:border-slate-600 transition-all group">
      <div className="flex items-start gap-4">
        {/* Company logo */}
        <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
          <img src={logoUrl} alt="" className="w-full h-full object-contain p-1.5"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-sm font-bold text-slate-400">${companyInitial}</span>`; }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">{title}</h3>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                <Building2 size={11} /> {company}
                {location && <span>· {location}</span>}
              </p>
            </div>

            {/* Match score */}
            {recipe.match_score > 0 && (
              <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                recipe.match_score >= 70 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : recipe.match_score >= 50 ? 'bg-karmio-50 text-karmio-600 dark:bg-karmio-900/30 dark:text-karmio-400'
                  : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
              }`}>
                {recipe.match_score}%
              </div>
            )}
          </div>

          {/* Summary preview */}
          {recipe.enhanced_summary && (
            <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">{recipe.enhanced_summary}</p>
          )}

          {/* Keywords */}
          {recipe.keywords_matched?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {recipe.keywords_matched.slice(0, 5).map(kw => (
                <span key={kw} className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  {kw}
                </span>
              ))}
              {recipe.keywords_matched.length > 5 && (
                <span className="text-[10px] text-slate-400">+{recipe.keywords_matched.length - 5} more</span>
              )}
            </div>
          )}

          {/* Footer: date + actions */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Calendar size={10} /> {date}
            </span>
            {recipe.version > 1 && (
              <Badge variant="default">v{recipe.version}</Badge>
            )}
            {recipe.cover_letter_text && (
              <Badge variant="info">Cover letter</Badge>
            )}

            <div className="ml-auto flex items-center gap-1.5">
              <button onClick={handleCopySummary}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Copy summary">
                {copiedSummary ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                {copiedSummary ? 'Copied' : 'Summary'}
              </button>
              <button onClick={() => onDownload('docx')} disabled={downloading}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-karmio-600 hover:bg-karmio-50 dark:hover:bg-karmio-900/20 transition-colors"
                title="Download DOCX">
                <Download size={10} /> DOCX
              </button>
              <button onClick={() => onDownload('pdf')} disabled={downloading}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-karmio-600 hover:bg-karmio-50 dark:hover:bg-karmio-900/20 transition-colors"
                title="Download PDF">
                <Download size={10} /> PDF
              </button>
              <button onClick={onEdit}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Edit in builder">
                <Pencil size={10} /> Edit
              </button>
              <button onClick={onDelete}
                className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Delete">
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
