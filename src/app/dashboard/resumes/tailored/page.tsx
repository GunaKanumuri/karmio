'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { MatchScoreExplainer } from '@/components/jobs/MatchScoreExplainer';

function TailoredResumeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const jobId = searchParams.get('job');

  const [job, setJob] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'resume' | 'cover'>('resume');

  // Fetch job details
  useEffect(() => {
    if (!jobId) return;

    fetch(`/api/jobs?id=${jobId}`)
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data?.[0]) {
          setJob(json.data[0]);
        }
      });
  }, [jobId]);

  const handleGenerate = async () => {
    if (!jobId) return;
    setGenerating(true);
    setError('');

    try {
      const res = await fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, action: 'generate' }),
      });

      const json = await res.json();

      if (!json.success) {
        setError(json.error?.message || 'Could not generate resume.');
        setGenerating(false);
        return;
      }

      setResult(json.data);
    } catch {
      setError('Connection error. Please try again.');
    }
    setGenerating(false);
  };

  const handleDownload = async (format: 'pdf' | 'docx') => {
    // For now, show the content - in production, this would download the file
    alert(`Download ${format.toUpperCase()} feature coming soon! For now, you can copy the content below.`);
  };

  if (!jobId) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto text-center py-20">
          <div className="w-16 h-16 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-400">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-surface-900 dark:text-white mb-3">Select a job to tailor your resume</h1>
          <p className="text-surface-500 mb-6">Choose a job from the feed to generate a tailored resume.</p>
          <button
            onClick={() => router.push('/dashboard/jobs/feed')}
            className="btn btn-primary"
          >
            Browse jobs
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 mb-4 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to jobs
          </button>

          <h1 className="text-2xl font-semibold text-surface-900 dark:text-white mb-2">Tailor your resume</h1>
          <p className="text-surface-500">
            Generate a customized resume optimized for this specific role.
          </p>
        </div>

        {/* Job card */}
        {job && (
          <div className="p-6 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl border border-surface-200 dark:border-surface-700 flex items-center justify-center bg-white dark:bg-surface-800 overflow-hidden">
                <img
                  src={`https://logo.clearbit.com/${job.company_name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`}
                  alt=""
                  className="w-10 h-10 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-surface-900 dark:text-white">{job.title}</h2>
                <p className="text-surface-500">{job.company_name} · {job.location}</p>
              </div>
            </div>
          </div>
        )}

        {/* Generate button */}
        {!result && (
          <div className="p-8 rounded-2xl border border-dashed border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-900 text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-karmio-50 dark:bg-karmio-900/30 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-karmio-500">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">
              AI-powered resume tailoring
            </h3>
            <p className="text-surface-500 mb-6 max-w-md mx-auto">
              Our AI will analyze the job description and customize your resume to highlight the most relevant skills and experiences.
            </p>

            {error && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 mb-4 max-w-md mx-auto">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn btn-primary btn-lg"
              data-testid="generate-resume-btn"
            >
              {generating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating... (20-30s)
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Generate tailored resume
                </>
              )}
            </button>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6 animate-slide-up">
            {/* Match score */}
            <div className="p-6 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900">
              <MatchScoreExplainer
                score={result.match_score || 0}
                explanation={result.match_explanation}
                jobTitle={job?.title || ''}
                companyName={job?.company_name || ''}
                keywordsMatched={result.keywords_matched || []}
                keywordsMissing={result.keywords_missing || []}
              />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-surface-100 dark:bg-surface-800 rounded-xl">
              <button
                onClick={() => setActiveTab('resume')}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'resume'
                    ? 'bg-white dark:bg-surface-900 text-surface-900 dark:text-white shadow-sm'
                    : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                }`}
              >
                Resume content
              </button>
              <button
                onClick={() => setActiveTab('cover')}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'cover'
                    ? 'bg-white dark:bg-surface-900 text-surface-900 dark:text-white shadow-sm'
                    : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                }`}
              >
                Cover letter
              </button>
            </div>

            {/* Resume content */}
            {activeTab === 'resume' && (
              <div className="p-6 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-surface-900 dark:text-white">Enhanced summary</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownload('pdf')}
                      className="btn btn-secondary btn-sm"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                      </svg>
                      PDF
                    </button>
                    <button
                      onClick={() => handleDownload('docx')}
                      className="btn btn-secondary btn-sm"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                      </svg>
                      DOCX
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800 mb-6">
                  <p className="text-surface-700 dark:text-surface-300 leading-relaxed">
                    {result.enhanced_summary || 'No summary generated.'}
                  </p>
                </div>

                {/* Keywords */}
                {result.keywords_matched?.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Keywords included</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.keywords_matched.map((kw: string, i: number) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {result.keywords_missing?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Consider adding</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.keywords_missing.map((kw: string, i: number) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-xs font-medium text-amber-700 dark:text-amber-300">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cover letter */}
            {activeTab === 'cover' && (
              <div className="p-6 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-surface-900 dark:text-white">Cover letter</h3>
                  <button
                    onClick={() => navigator.clipboard.writeText(result.cover_letter_text || '')}
                    className="btn btn-secondary btn-sm"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                    Copy
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800">
                  <pre className="text-surface-700 dark:text-surface-300 leading-relaxed whitespace-pre-wrap font-sans text-sm">
                    {result.cover_letter_text || 'No cover letter generated.'}
                  </pre>
                </div>
              </div>
            )}

            {/* Regenerate */}
            <div className="text-center">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="btn btn-ghost text-sm"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M1 4v6h6M23 20v-6h-6" />
                  <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
                </svg>
                Regenerate
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function TailoredResumePage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-karmio-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    }>
      <TailoredResumeContent />
    </Suspense>
  );
}
