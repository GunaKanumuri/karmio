'use client';

import { Badge } from '@/components/ui/Badge';

interface KeywordHighlightProps {
  matched: string[];
  missing: string[];
  compact?: boolean;
}

export function KeywordHighlight({ matched, missing, compact }: KeywordHighlightProps) {
  if (matched.length === 0 && missing.length === 0) return null;

  const totalRequired = matched.length + missing.length;
  const matchPct = totalRequired > 0 ? Math.round((matched.length / totalRequired) * 100) : 0;

  return (
    <div className={compact ? '' : 'bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4'}>
      {!compact && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Keyword match</p>
          <Badge variant={matchPct >= 70 ? 'success' : matchPct >= 40 ? 'warning' : 'danger'}>
            {matchPct}% ({matched.length}/{totalRequired})
          </Badge>
        </div>
      )}

      {/* Match bar */}
      {!compact && totalRequired > 0 && (
        <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mb-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${matchPct >= 70 ? 'bg-emerald-500' : matchPct >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${matchPct}%` }}
          />
        </div>
      )}

      {matched.length > 0 && (
        <div className="mb-2">
          {!compact && <p className="text-[10px] text-slate-500 mb-1">Matched</p>}
          <div className="flex gap-1 flex-wrap">
            {matched.map(kw => (
              <span key={kw} className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium rounded-full border border-emerald-200 dark:border-emerald-800">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {missing.length > 0 && (
        <div>
          {!compact && <p className="text-[10px] text-slate-500 mb-1">Missing — consider adding to your profile</p>}
          <div className="flex gap-1 flex-wrap">
            {missing.map(kw => (
              <span key={kw} className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-medium rounded-full border border-amber-200 dark:border-amber-800">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
