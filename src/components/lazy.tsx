import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/shared/Helpers';

// ─── Chart.js based WeeklyChart (60KB+ gzipped) ───
export const LazyWeeklyChart = dynamic(
  () => import('@/components/dashboard/LiveClock').then(mod => ({ default: mod.WeeklyChart })),
  { loading: () => <div className="h-32 rounded-xl bg-slate-50 dark:bg-slate-800/50 animate-pulse" />, ssr: false }
);

// ─── Resume editor (rich form with validation logic) ───
export const LazyResumeEditor = dynamic(
  () => import('@/components/resumes/ResumeEditor').then(mod => ({ default: mod.ResumeEditor })),
  { loading: () => <div className="h-64 rounded-xl bg-slate-50 dark:bg-slate-800/50 animate-pulse" /> }
);

// ─── Resume comparison (side-by-side with highlights) ───
export const LazyResumeComparison = dynamic(
  () => import('@/components/resumes/ResumeComparison').then(mod => ({ default: mod.ResumeComparison })),
  { loading: () => <div className="h-48 rounded-xl bg-slate-50 dark:bg-slate-800/50 animate-pulse" /> }
);

// ─── Message crafter (AI-powered, needs templates) ───
export const LazyMessageCrafter = dynamic(
  () => import('@/components/network/MessageCrafter').then(mod => ({ default: mod.MessageCrafter })),
  { loading: () => <div className="h-32 rounded-xl bg-slate-50 dark:bg-slate-800/50 animate-pulse" /> }
);

// ─── Company intel panel ───
export const LazyCompanyIntel = dynamic(
  () => import('@/components/jobs/CompanyIntel').then(mod => ({ default: mod.CompanyIntel })),
  { loading: () => <div className="h-24 rounded-xl bg-slate-50 dark:bg-slate-800/50 animate-pulse" /> }
);

// ─── Cover letter toggle ───
export const LazyCoverLetterToggle = dynamic(
  () => import('@/components/resumes/CoverLetterToggle').then(mod => ({ default: mod.CoverLetterToggle })),
  { loading: () => <div className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/50 animate-pulse" /> }
);

// ─── Keyword highlight ───
export const LazyKeywordHighlight = dynamic(
  () => import('@/components/resumes/KeywordHighlight').then(mod => ({ default: mod.KeywordHighlight })),
  { loading: () => <div className="h-16 rounded-xl bg-slate-50 dark:bg-slate-800/50 animate-pulse" /> }
);
