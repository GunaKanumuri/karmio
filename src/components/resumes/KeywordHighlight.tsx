'use client';

import { ATSKeywordBar, computeATSScore } from './ATSKeywordBar';

interface KeywordHighlightProps {
  text: string;
  keywordsMatched: string[];
  keywordsMissing: string[];
}

/**
 * Renders text with matched keywords highlighted in green
 * and missing keywords noted at the bottom.
 * Used in resume builder preview and job detail page.
 */
export function KeywordHighlight({ text, keywordsMatched, keywordsMissing }: KeywordHighlightProps) {
  // Build a regex to highlight matched keywords in the text
  const highlightPattern = keywordsMatched.length > 0
    ? new RegExp(`\\b(${keywordsMatched.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi')
    : null;

  const parts = highlightPattern
    ? text.split(highlightPattern)
    : [text];

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        {parts.map((part, i) => {
          const isMatch = keywordsMatched.some(kw => kw.toLowerCase() === part.toLowerCase());
          return isMatch ? (
            <mark key={i} className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 px-0.5 rounded">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          );
        })}
      </p>

      <ATSKeywordBar
        keywordsMatched={keywordsMatched}
        keywordsMissing={keywordsMissing}
        compact
      />
    </div>
  );
}