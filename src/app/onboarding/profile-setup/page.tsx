'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';

const VISA_OPTIONS = [
  { id: 'citizen', label: 'US Citizen' },
  { id: 'green_card', label: 'Green Card Holder' },
  { id: 'h1b', label: 'H1B Visa' },
  { id: 'stem_opt', label: 'STEM OPT' },
  { id: 'opt', label: 'OPT' },
  { id: 'other', label: 'Other / Not applicable' },
];

export default function ProfileSetupPage() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [visaStatus, setVisaStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Resume upload state
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'parsing' | 'saving' | 'done' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [parsedData, setParsedData] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ─── Resume Upload + Parse + Autofill ───
  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadStatus('error');
      setUploadMessage('File must be under 5MB.');
      return;
    }

    setUploading(true);
    setUploadStatus('parsing');
    setUploadMessage('Reading your resume...');

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
        setUploadStatus('error');
        setUploadMessage(parseJson.error?.message || 'Could not read this file. Try a different format.');
        setUploading(false);
        return;
      }

      const parsed = parseJson.data;
      setParsedData(parsed);

      // Step 2: Autofill form fields
      if (parsed.full_name && !fullName) setFullName(parsed.full_name);
      if (parsed.phone && !phone) setPhone(parsed.phone);
      if (parsed.linkedin_url && !linkedin) setLinkedin(parsed.linkedin_url);
      if (parsed.github_url && !github) setGithub(parsed.github_url);
      if (parsed.portfolio_url && !portfolio) setPortfolio(parsed.portfolio_url);

      // Step 3: Save parsed data to DB
      setUploadStatus('saving');
      setUploadMessage('Saving your experiences, projects & skills...');

      const saveRes = await fetch('/api/profile/upload-resume/save', {
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

        setUploadStatus('done');
        setUploadMessage(parts.length > 0
          ? `Imported ${parts.join(', ')}. Review and continue!`
          : 'Resume parsed. Some fields were autofilled.');
      } else {
        setUploadStatus('done');
        setUploadMessage('Resume parsed and form autofilled. Could not save all details — you can add them later.');
      }
    } catch {
      setUploadStatus('error');
      setUploadMessage('Upload failed. You can fill in your details manually below.');
    }

    setUploading(false);
  };

  // ─── Save profile + complete onboarding ───
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          phone: phone || null,
          linkedin_url: linkedin || null,
          github_url: github || null,
          portfolio_url: portfolio || null,
          visa_status: visaStatus || null,
          onboarding_complete: true,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message || 'Could not save profile.');
        setSaving(false);
        return;
      }

      router.push('/dashboard/home');
    } catch {
      setError('Connection error. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-surface-950 flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-surface-100 dark:bg-surface-800">
        <div className="h-full bg-karmio-500 transition-all duration-500" style={{ width: '90%' }} />
      </div>

      <header className="px-6 py-4 flex items-center justify-between border-b border-surface-200 dark:border-surface-800">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-karmio-500 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="font-semibold text-surface-900 dark:text-white">Karmio</span>
        </Link>
        <div className="text-sm text-surface-500">Step 3 of 3</div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12 overflow-auto">
        <div className="w-full max-w-lg animate-slide-up">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold text-surface-900 dark:text-white mb-3">Almost there!</h1>
            <p className="text-surface-600 dark:text-surface-400">
              Upload your resume to auto-fill, or enter details manually.
            </p>
          </div>

          {/* ─── Resume Upload Card ─── */}
          <div className={`mb-6 p-5 rounded-2xl border-2 border-dashed transition-all ${
            uploadStatus === 'done'
              ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/10'
              : uploadStatus === 'error'
              ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10'
              : 'border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800/30 hover:border-karmio-400 dark:hover:border-karmio-600'
          }`}>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={handleResumeUpload}
              className="hidden"
            />

            {uploadStatus === 'idle' ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full flex flex-col items-center gap-2 py-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-karmio-100 dark:bg-karmio-900/30 flex items-center justify-center">
                  <Upload size={20} className="text-karmio-500" />
                </div>
                <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
                  Upload your resume (PDF or DOCX)
                </p>
                <p className="text-xs text-surface-400">
                  We&apos;ll auto-fill your profile, experiences, projects & skills
                </p>
              </button>
            ) : (
              <div className="flex items-start gap-3">
                {uploadStatus === 'parsing' || uploadStatus === 'saving' ? (
                  <Loader2 size={18} className="text-karmio-500 animate-spin mt-0.5 flex-shrink-0" />
                ) : uploadStatus === 'done' ? (
                  <CheckCircle2 size={18} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    uploadStatus === 'done' ? 'text-emerald-700 dark:text-emerald-300'
                    : uploadStatus === 'error' ? 'text-red-600 dark:text-red-400'
                    : 'text-surface-700 dark:text-surface-300'
                  }`}>
                    {uploadMessage}
                  </p>
                  {uploadStatus === 'done' && parsedData && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                      {parsedData.experiences?.length || 0} experiences · {parsedData.projects?.length || 0} projects · {parsedData.skills?.length || 0} skills detected
                    </p>
                  )}
                  {(uploadStatus === 'done' || uploadStatus === 'error') && (
                    <button
                      type="button"
                      onClick={() => { setUploadStatus('idle'); fileRef.current?.click(); }}
                      className="text-xs text-karmio-500 hover:text-karmio-600 mt-2 font-medium"
                    >
                      Upload a different resume
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ─── Manual Form (autofilled from resume) ─── */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="fullName" className="input-label">Full name</label>
              <input id="fullName" type="text" value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Jane Doe" required className="input-field" />
            </div>

            <div>
              <label htmlFor="phone" className="input-label">Phone <span className="text-surface-400 font-normal">(optional)</span></label>
              <input id="phone" type="tel" value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567" className="input-field" />
            </div>

            <div>
              <label htmlFor="linkedin" className="input-label">LinkedIn <span className="text-surface-400 font-normal">(optional)</span></label>
              <input id="linkedin" type="url" value={linkedin}
                onChange={e => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/yourprofile" className="input-field" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="github" className="input-label">GitHub <span className="text-surface-400 font-normal">(opt.)</span></label>
                <input id="github" type="url" value={github}
                  onChange={e => setGithub(e.target.value)}
                  placeholder="https://github.com/you" className="input-field" />
              </div>
              <div>
                <label htmlFor="portfolio" className="input-label">Portfolio <span className="text-surface-400 font-normal">(opt.)</span></label>
                <input id="portfolio" type="url" value={portfolio}
                  onChange={e => setPortfolio(e.target.value)}
                  placeholder="https://yoursite.com" className="input-field" />
              </div>
            </div>

            <div>
              <label className="input-label">Work authorization</label>
              <div className="grid grid-cols-2 gap-2">
                {VISA_OPTIONS.map(option => (
                  <button key={option.id} type="button"
                    onClick={() => setVisaStatus(option.id)}
                    className={`p-3 rounded-xl border text-sm text-left transition-all ${
                      visaStatus === option.id
                        ? 'border-karmio-500 bg-karmio-50 dark:bg-karmio-900/20 text-karmio-700 dark:text-karmio-300'
                        : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:border-surface-300'
                    }`}>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Parsed data summary */}
            {parsedData && uploadStatus === 'done' && (
              <div className="p-4 rounded-xl bg-karmio-50 dark:bg-karmio-900/20 border border-karmio-200 dark:border-karmio-800">
                <p className="text-xs font-semibold text-karmio-700 dark:text-karmio-300 mb-2 flex items-center gap-1.5">
                  <FileText size={12} /> Auto-imported from resume
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-karmio-600 dark:text-karmio-400">
                  <span>{parsedData.experiences?.length || 0} work experiences</span>
                  <span>{parsedData.projects?.length || 0} projects</span>
                  <span>{parsedData.education?.length || 0} education entries</span>
                  <span>{parsedData.skills?.length || 0} skills</span>
                </div>
                <p className="text-[10px] text-karmio-500 mt-2">
                  You can edit all of these in your profile after setup.
                </p>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="pt-4">
              <button type="submit" disabled={!fullName || saving}
                className="btn btn-primary btn-lg w-full disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Setting up...</>
                ) : 'Start exploring jobs'}
              </button>
            </div>
          </form>

          <p className="text-center text-sm text-surface-500 mt-6">
            You can update your profile anytime in settings.
          </p>
        </div>
      </main>
    </div>
  );
}