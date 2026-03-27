'use client';

import { useState } from 'react';
import { useGenerateCoverLetter } from '@/hooks/useResume';
import { FileText, Loader2, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface CoverLetterToggleProps {
  jobId: string;
  companyName: string;
  jobTitle: string;
  existingLetter?: string | null;
}

export function CoverLetterToggle({ jobId, companyName, jobTitle, existingLetter }: CoverLetterToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [letter, setLetter] = useState(existingLetter || '');
  const [copied, setCopied] = useState(false);

  const generateMutation = useGenerateCoverLetter();

  const handleGenerate = async () => {
    const result = await generateMutation.mutateAsync({ job_id: jobId });
    if (result.success && result.data?.cover_letter_text) {
      setLetter(result.data.cover_letter_text);
      setIsOpen(true);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => letter ? setIsOpen(!isOpen) : handleGenerate()}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <FileText size={14} className="text-karmio-500" />
          Cover Letter
          {letter && <span className="text-[10px] text-emerald-500 font-semibold">Generated</span>}
        </div>
        {generateMutation.isPending ? (
          <Loader2 size={14} className="animate-spin text-karmio-500" />
        ) : letter ? (
          isOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />
        ) : (
          <span className="text-xs text-karmio-600 font-medium">Generate</span>
        )}
      </button>

      {isOpen && letter && (
        <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-800">
          <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {letter}
            </p>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={handleCopy}>
              {copied ? <><Check size={12} className="mr-1" />Copied</> : <><Copy size={12} className="mr-1" />Copy</>}
            </Button>
            <Button size="sm" onClick={handleGenerate} loading={generateMutation.isPending}>
              Regenerate
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}