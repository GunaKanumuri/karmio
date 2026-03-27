'use client';

import { useMemo } from 'react';
import { CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';

interface ATSKeywordBarProps {
  keywordsMatched: string[];
  keywordsMissing: string[];
  totalRequired?: number;
  compact?: boolean; // for inline use in job cards
}

export function ATSKeywordBar({
  keywordsMatched,
  keywordsMissing,
  totalRequired,
  compact = false,
}: ATSKeywordBarProps) {
  const total = totalRequired || (keywordsMatched.length + keywordsMissing.length) || 1;
  const score = Math.round((keywordsMatched.length / total) * 100);

  const barColor = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-karmio-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = score >= 80 ? 'text-emerald-600 dark:text-emerald-400'
    : score >= 60 ? 'text-karmio-600 dark:text-karmio-400'
    : score >= 40 ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400';

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${score}%` }} />
        </div>
        <span className={`text-[10px] font-semibold ${textColor}`}>{score}% ATS</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Score bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">ATS Keyword Match</span>
          <span className={`text-xs font-semibold ${textColor}`}>
            {keywordsMatched.length}/{total} keywords · {score}%
          </span>
        </div>
        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${score}%` }} />
        </div>
      </div>

      {/* Matched keywords */}
      {keywordsMatched.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <CheckCircle2 size={12} className="text-emerald-500" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Found in your resume ({keywordsMatched.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {keywordsMatched.map(kw => (
              <span key={kw} className="px-2 py-0.5 rounded-md text-[11px] bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Missing keywords */}
      {keywordsMissing.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertCircle size={12} className="text-amber-500" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Missing — add to improve score ({keywordsMissing.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {keywordsMissing.map(kw => (
              <span key={kw} className="px-2 py-0.5 rounded-md text-[11px] bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Utility: compute ATS score from any keyword arrays (used by job detail, builder, etc.)
export function computeATSScore(matched: string[], missing: string[]): number {
  const total = matched.length + missing.length;
  if (total === 0) return 0;
  return Math.round((matched.length / total) * 100);
}