'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { FileText, Sparkles, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface CoverLetterToggleProps {
  resumeId: string;
  existingLetter?: string | null;
  companyName: string;
  roleTitle: string;
}

export function CoverLetterToggle({ resumeId, existingLetter, companyName, roleTitle }: CoverLetterToggleProps) {
  const [expanded, setExpanded] = useState(false);
  const [letter, setLetter] = useState(existingLetter || '');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/resumes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_id: resumeId, action: 'cover_letter' }),
      });
      const json = await res.json();
      if (json.success && json.data?.cover_letter_text) {
        setLetter(json.data.cover_letter_text);
      } else {
        setError(json.error?.message || 'Could not generate cover letter.');
      }
    } catch {
      setError('Network error.');
    }
    setGenerating(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-karmio-500" />
          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Cover letter</span>
          {letter ? <Badge variant="success">Generated</Badge> : <Badge>Not generated</Badge>}
        </div>
        {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-800">
          {letter ? (
            <div className="mt-3">
              <div className="flex justify-end gap-1 mb-2">
                <Button size="sm" variant="ghost" onClick={handleCopy}>
                  {copied ? <><Check size={13} className="text-emerald-500" /> Copied</> : <><Copy size={13} /> Copy</>}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleGenerate} loading={generating}>
                  <Sparkles size={13} className="mr-1" />Regenerate
                </Button>
              </div>
              <Textarea value={letter} onChange={e => setLetter(e.target.value)} rows={10} className="text-xs" />
            </div>
          ) : (
            <div className="mt-3 text-center py-4">
              <p className="text-xs text-slate-500 mb-3">Generate an AI cover letter tailored for {companyName} — {roleTitle}</p>
              <Button variant="primary" size="sm" onClick={handleGenerate} loading={generating}>
                <Sparkles size={13} className="mr-1" />Generate cover letter
              </Button>
              {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
