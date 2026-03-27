'use client';

import { useMemo } from 'react';
import { CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { ATSKeywordBar } from './ATSKeywordBar';

interface ResumeComparisonProps {
  originalSummary: string;
  enhancedSummary: string;
  originalBullets: Record<string, string[]>;
  enhancedBullets: Record<string, string[]>;
  experiences: { id: string; company: string; title: string }[];
  keywordsMatched: string[];
  keywordsMissing: string[];
}

export function ResumeComparison({
  originalSummary,
  enhancedSummary,
  originalBullets,
  enhancedBullets,
  experiences,
  keywordsMatched,
  keywordsMissing,
}: ResumeComparisonProps) {
  const changedExperiences = useMemo(() => {
    return experiences.filter(exp => {
      const orig = (originalBullets[exp.id] || []).join('|');
      const enhanced = (enhancedBullets[exp.id] || []).join('|');
      return orig !== enhanced;
    });
  }, [experiences, originalBullets, enhancedBullets]);

  const summaryChanged = originalSummary !== enhancedSummary;

  return (
    <div className="space-y-6">
      {/* ATS Score */}
      <ATSKeywordBar
        keywordsMatched={keywordsMatched}
        keywordsMissing={keywordsMissing}
      />

      {/* Summary comparison */}
      {summaryChanged && (
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <Sparkles size={14} className="text-karmio-500" />
            Summary
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-2">Original</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{originalSummary || 'No summary'}</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800">
              <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase mb-2">
                AI Enhanced
              </p>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{enhancedSummary}</p>
            </div>
          </div>
        </div>
      )}

      {/* Experience bullet comparisons */}
      {changedExperiences.map(exp => (
        <div key={exp.id}>
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            {exp.title} at {exp.company}
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Original</p>
              {(originalBullets[exp.id] || []).map((bullet, i) => (
                <p key={i} className="text-xs text-slate-500 dark:text-slate-400">• {bullet}</p>
              ))}
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Enhanced</p>
              {(enhancedBullets[exp.id] || []).map((bullet, i) => (
                <p key={i} className="text-xs text-slate-700 dark:text-slate-300">• {bullet}</p>
              ))}
            </div>
          </div>
        </div>
      ))}

      {changedExperiences.length === 0 && !summaryChanged && (
        <div className="text-center py-8 text-slate-400 dark:text-slate-500">
          <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-400" />
          <p className="text-sm">Your resume is already well-optimized for this role.</p>
        </div>
      )}
    </div>
  );
}