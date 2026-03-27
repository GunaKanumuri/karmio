'use client';

import { useState } from 'react';
import { MatchRing } from '@/components/ui/Badge';
import {
  ChevronDown, ChevronUp, CheckCircle2, AlertCircle,
  Sparkles, X, FileText,
} from 'lucide-react';

interface MatchExplanation {
  overall: string;
  strengths: string[];
  gaps: string[];
  tips: string[];
}

interface MatchScoreExplainerProps {
  score: number;
  explanation?: MatchExplanation;
  jobTitle: string;
  companyName: string;
  keywordsMatched?: string[];
  keywordsMissing?: string[];
}

export function MatchScoreExplainer({
  score,
  explanation,
  jobTitle,
  companyName,
  keywordsMatched = [],
  keywordsMissing = [],
}: MatchScoreExplainerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* Score button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${
          isOpen
            ? 'bg-karmio-50 dark:bg-karmio-900/20 border-karmio-200 dark:border-karmio-700 shadow-sm'
            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
        }`}
        data-testid="match-score-btn"
      >
        <MatchRing score={score} size={40} />
        <div className="text-left">
          <div className="text-sm font-medium text-slate-900 dark:text-white">
            {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Low'} match
          </div>
          <div className="text-xs text-slate-500">Click for details</div>
        </div>
        {isOpen ? (
          <ChevronUp size={16} className="text-slate-400" />
        ) : (
          <ChevronDown size={16} className="text-slate-400" />
        )}
      </button>

      {/* Expanded explanation */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg z-50 animate-fade-in origin-top min-w-[360px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Match breakdown</h3>
              <p className="text-sm text-slate-500">{jobTitle} at {companyName}</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} className="text-slate-400" />
            </button>
          </div>

          {/* Score visualization */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-600 dark:text-slate-400">Profile match</span>
              <span className={`font-semibold ${
                score >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                score >= 60 ? 'text-karmio-600 dark:text-karmio-400' :
                score >= 40 ? 'text-amber-600 dark:text-amber-400' :
                'text-red-600 dark:text-red-400'
              }`}>{score}%</span>
            </div>
            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  score >= 80 ? 'bg-emerald-500' :
                  score >= 60 ? 'bg-karmio-500' :
                  score >= 40 ? 'bg-amber-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>

          {/* Overall assessment */}
          {explanation?.overall && (
            <div className={`p-4 rounded-xl mb-4 ${
              score >= 80 ? 'bg-emerald-50 dark:bg-emerald-900/20' :
              score >= 60 ? 'bg-karmio-50 dark:bg-karmio-900/20' :
              score >= 40 ? 'bg-amber-50 dark:bg-amber-900/20' :
              'bg-red-50 dark:bg-red-900/20'
            }`}>
              <p className={`text-sm ${
                score >= 80 ? 'text-emerald-700 dark:text-emerald-300' :
                score >= 60 ? 'text-karmio-700 dark:text-karmio-300' :
                score >= 40 ? 'text-amber-700 dark:text-amber-300' :
                'text-red-700 dark:text-red-300'
              }`}>
                {explanation.overall}
              </p>
            </div>
          )}

          {/* Keywords matched */}
          {keywordsMatched.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Skills that match</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {keywordsMatched.slice(0, 8).map((kw, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-xs font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Keywords missing */}
          {keywordsMissing.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={14} className="text-amber-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Skills to highlight</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {keywordsMissing.slice(0, 5).map((kw, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-xs font-medium text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Strengths */}
          {explanation?.strengths && explanation.strengths.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Your strengths</h4>
              <ul className="space-y-1.5">
                {explanation.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Gaps */}
          {explanation?.gaps && explanation.gaps.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Areas to improve</h4>
              <ul className="space-y-1.5">
                {explanation.gaps.map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <span className="text-amber-500 mt-0.5">○</span>
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tips */}
          {explanation?.tips && explanation.tips.length > 0 && (
            <div className="p-4 rounded-xl bg-karmio-50 dark:bg-karmio-900/20 border border-karmio-100 dark:border-karmio-800/50">
              <h4 className="text-sm font-medium text-karmio-700 dark:text-karmio-300 mb-2 flex items-center gap-2">
                <Sparkles size={14} />
                Tips to improve your match
              </h4>
              <ul className="space-y-1.5">
                {explanation.tips.map((t, i) => (
                  <li key={i} className="text-sm text-karmio-600 dark:text-karmio-400">
                    • {t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
            <button className="flex-1 btn btn-primary btn-sm flex items-center justify-center gap-2" data-testid="tailor-resume-btn">
              <FileText size={13} />
              Tailor my resume
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setIsOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Simplified inline version for job cards
export function MatchScoreBadge({ score, onClick }: { score: number; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="transition-all hover:scale-105"
      title="Click for match details"
      data-testid="match-score-badge"
    >
      <MatchRing score={score} showLabel />
    </button>
  );
}