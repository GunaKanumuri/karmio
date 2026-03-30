'use client';

import { useState, useRef } from 'react';
import { Upload, Loader2, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ResumeImporterProps {
  /** Callback fired after successful parse+save with the parsed data and save results */
  onImportComplete?: (parsedData: any, saveResults: any) => void;
  /** 'merge' adds new entries alongside existing, 'replace' clears existing first */
  mode?: 'merge' | 'replace';
  /** Visual variant: 'card' = full dashed upload card, 'button' = compact button only */
  variant?: 'card' | 'button';
  /** Button label when variant='button' */
  buttonLabel?: string;
}

type UploadStatus = 'idle' | 'parsing' | 'saving' | 'done' | 'error';

export function ResumeImporter({
  onImportComplete,
  mode = 'merge',
  variant = 'card',
  buttonLabel = 'Import Resume',
}: ResumeImporterProps) {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [message, setMessage] = useState('');
  const [parsedData, setParsedData] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setStatus('error');
      setMessage('File must be under 5MB.');
      return;
    }

    setStatus('parsing');
    setMessage('Reading your resume...');

    try {
      // Step 1: Upload + parse
      const formData = new FormData();
      formData.append('resume', file);

      const parseRes = await fetch('/api/profile/upload-resume', {
        method: 'POST',
        body: formData,
      });
      const parseJson = await parseRes.json();

      if (!parseJson.success) {
        setStatus('error');
        setMessage(parseJson.error?.message || 'Could not read this file. Try a different format.');
        resetFileInput();
        return;
      }

      const parsed = parseJson.data;
      setParsedData(parsed);

      // Step 2: Save parsed data to DB
      setStatus('saving');
      setMessage('Saving your experiences, projects & skills...');

      const saveRes = await fetch(`/api/profile/upload-resume/save?mode=${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      const saveJson = await saveRes.json();

      if (saveJson.success) {
        const d = saveJson.data;
        const parts = [];
        if (d.experiences > 0) parts.push(`${d.experiences} experiences`);
        if (d.projects > 0) parts.push(`${d.projects} projects`);
        if (d.education > 0) parts.push(`${d.education} education`);
        if (d.skills > 0) parts.push(`${d.skills} skills`);

        setStatus('done');
        setMessage(parts.length > 0
          ? `Imported ${parts.join(', ')}.`
          : 'Resume parsed. Profile fields updated.');

        onImportComplete?.(parsed, saveJson.data);
      } else {
        setStatus('done');
        setMessage('Resume parsed but some data could not be saved. You can add entries manually.');
        onImportComplete?.(parsed, null);
      }
    } catch {
      setStatus('error');
      setMessage('Upload failed. Please try again or fill in details manually.');
    }

    resetFileInput();
  };

  const resetFileInput = () => {
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleRetry = () => {
    setStatus('idle');
    setParsedData(null);
    setMessage('');
    fileRef.current?.click();
  };

  // Hidden file input (shared by both variants)
  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept=".pdf,.docx,.doc"
      onChange={handleUpload}
      className="hidden"
    />
  );

  // ─── Button variant ────────────────────────────────────────────────────────
  if (variant === 'button') {
    return (
      <>
        {fileInput}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => fileRef.current?.click()}
          loading={status === 'parsing' || status === 'saving'}
          disabled={status === 'parsing' || status === 'saving'}
        >
          <Upload size={14} />
          {status === 'parsing' ? 'Parsing...' : status === 'saving' ? 'Saving...' : buttonLabel}
        </Button>
      </>
    );
  }

  // ─── Card variant ──────────────────────────────────────────────────────────
  return (
    <div className={`p-5 rounded-2xl border-2 border-dashed transition-all ${
      status === 'done'
        ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/10'
        : status === 'error'
        ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10'
        : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/30 hover:border-karmio-400 dark:hover:border-karmio-600'
    }`}>
      {fileInput}

      {status === 'idle' ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full flex flex-col items-center gap-2 py-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-karmio-100 dark:bg-karmio-900/30 flex items-center justify-center">
            <Upload size={20} className="text-karmio-500" />
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Upload your resume (PDF or DOCX)
          </p>
          <p className="text-xs text-slate-400">
            We&apos;ll extract your experiences, projects, education & skills
          </p>
        </button>
      ) : (
        <div className="flex items-start gap-3">
          {(status === 'parsing' || status === 'saving') ? (
            <Loader2 size={18} className="text-karmio-500 animate-spin mt-0.5 flex-shrink-0" />
          ) : status === 'done' ? (
            <CheckCircle2 size={18} className="text-emerald-500 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1">
            <p className={`text-sm font-medium ${
              status === 'done' ? 'text-emerald-700 dark:text-emerald-300'
              : status === 'error' ? 'text-red-600 dark:text-red-400'
              : 'text-slate-700 dark:text-slate-300'
            }`}>
              {message}
            </p>
            {status === 'done' && parsedData && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                {parsedData.experiences?.length || 0} experiences · {parsedData.projects?.length || 0} projects · {parsedData.skills?.length || 0} skills detected
              </p>
            )}
            {(status === 'done' || status === 'error') && (
              <button
                type="button"
                onClick={handleRetry}
                className="text-xs text-karmio-500 hover:text-karmio-600 mt-2 font-medium"
              >
                Upload a different resume
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}