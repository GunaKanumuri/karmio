'use client';

import { useState } from 'react';

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

  const scoreColor = score >= 80 ? 'emerald' : score >= 60 ? 'karmio' : score >= 40 ? 'amber' : 'red';
  const scoreLabel = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Low';

  return (
    <div className="relative">
      {/* Score button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
          isOpen 
            ? `bg-${scoreColor}-50 dark:bg-${scoreColor}-900/30 border-${scoreColor}-300 dark:border-${scoreColor}-700`
            : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'
        }`}
        data-testid="match-score-btn"
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold ${
          score >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' :
          score >= 60 ? 'bg-karmio-100 text-karmio-700 dark:bg-karmio-900/50 dark:text-karmio-300' :
          score >= 40 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
          'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
        }`}>
          {score}%
        </div>
        <div className="text-left">
          <div className="text-sm font-medium text-surface-900 dark:text-white">{scoreLabel} match</div>
          <div className="text-xs text-surface-500">Click for details</div>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-surface-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Expanded explanation */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 p-6 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-2xl shadow-lg z-50 animate-scale-in origin-top min-w-[360px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-surface-100 dark:border-surface-800">
            <div>
              <h3 className="font-semibold text-surface-900 dark:text-white">Match breakdown</h3>
              <p className="text-sm text-surface-500">{jobTitle} at {companyName}</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-400">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Score visualization */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-surface-600 dark:text-surface-400">Profile match</span>
              <span className={`font-semibold ${
                score >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                score >= 60 ? 'text-karmio-600 dark:text-karmio-400' :
                score >= 40 ? 'text-amber-600 dark:text-amber-400' :
                'text-red-600 dark:text-red-400'
              }`}>{score}%</span>
            </div>
            <div className="h-3 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500">
                  <path d="M5 12l5 5L20 7" />
                </svg>
                <span className="text-sm font-medium text-surface-700 dark:text-surface-300">Skills that match</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {keywordsMatched.slice(0, 8).map((kw, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-xs font-medium text-emerald-700 dark:text-emerald-300">
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                <span className="text-sm font-medium text-surface-700 dark:text-surface-300">Skills to highlight</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {keywordsMissing.slice(0, 5).map((kw, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-xs font-medium text-amber-700 dark:text-amber-300">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Strengths */}
          {explanation?.strengths && explanation.strengths.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Your strengths</h4>
              <ul className="space-y-1.5">
                {explanation.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-surface-600 dark:text-surface-400">
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
              <h4 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Areas to improve</h4>
              <ul className="space-y-1.5">
                {explanation.gaps.map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-surface-600 dark:text-surface-400">
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
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
          <div className="mt-4 pt-4 border-t border-surface-100 dark:border-surface-800 flex gap-3">
            <button className="flex-1 btn btn-primary btn-sm" data-testid="tailor-resume-btn">
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
      className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center text-sm font-semibold transition-all hover:scale-105 ${
        score >= 80 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
        score >= 60 ? 'bg-karmio-50 text-karmio-600 dark:bg-karmio-900/30 dark:text-karmio-400' :
        score >= 40 ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
        'bg-surface-100 text-surface-500 dark:bg-surface-800'
      }`}
      title="Click for match details"
      data-testid="match-score-badge"
    >
      <span>{score}%</span>
    </button>
  );
}
