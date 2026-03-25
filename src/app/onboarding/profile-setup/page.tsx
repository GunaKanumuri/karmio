'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProfileSetupPage() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [visaStatus, setVisaStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

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
          portfolio_url: portfolio || null,
          visa_status: visaStatus || null,
          onboarding_complete: true,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message || 'Could not save profile. Please try again.');
        setSaving(false);
        return;
      }

      router.push('/dashboard/home');
    } catch {
      setError('Connection error. Please try again.');
      setSaving(false);
    }
  };

  const VISA_OPTIONS = [
    { id: 'citizen', label: 'US Citizen' },
    { id: 'green_card', label: 'Green Card Holder' },
    { id: 'h1b', label: 'H1B Visa' },
    { id: 'stem_opt', label: 'STEM OPT' },
    { id: 'opt', label: 'OPT' },
    { id: 'other', label: 'Other / Not applicable' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-surface-950 flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-surface-100 dark:bg-surface-800">
        <div className="h-full bg-karmio-500 transition-all duration-500" style={{ width: '90%' }} />
      </div>

      {/* Header */}
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

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12 overflow-auto">
        <div className="w-full max-w-lg animate-slide-up">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-semibold text-surface-900 dark:text-white mb-3">Almost there!</h1>
            <p className="text-surface-600 dark:text-surface-400">
              A few more details to personalize your experience.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="fullName" className="input-label">Full name</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Jane Doe"
                required
                className="input-field"
                data-testid="profile-fullname"
              />
            </div>

            <div>
              <label htmlFor="phone" className="input-label">Phone number <span className="text-surface-400 font-normal">(optional)</span></label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="input-field"
                data-testid="profile-phone"
              />
            </div>

            <div>
              <label htmlFor="linkedin" className="input-label">LinkedIn URL <span className="text-surface-400 font-normal">(optional)</span></label>
              <input
                id="linkedin"
                type="url"
                value={linkedin}
                onChange={e => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/yourprofile"
                className="input-field"
                data-testid="profile-linkedin"
              />
            </div>

            <div>
              <label htmlFor="portfolio" className="input-label">Portfolio or GitHub <span className="text-surface-400 font-normal">(optional)</span></label>
              <input
                id="portfolio"
                type="url"
                value={portfolio}
                onChange={e => setPortfolio(e.target.value)}
                placeholder="https://yoursite.com"
                className="input-field"
                data-testid="profile-portfolio"
              />
            </div>

            <div>
              <label className="input-label">Work authorization</label>
              <div className="grid grid-cols-2 gap-2">
                {VISA_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setVisaStatus(option.id)}
                    className={`p-3 rounded-xl border text-sm text-left transition-all ${
                      visaStatus === option.id
                        ? 'border-karmio-500 bg-karmio-50 dark:bg-karmio-900/20 text-karmio-700 dark:text-karmio-300'
                        : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:border-surface-300 dark:hover:border-surface-600'
                    }`}
                    data-testid={`visa-${option.id}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 animate-fade-in">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={!fullName || saving}
                className="btn btn-primary btn-lg w-full disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="profile-submit"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Setting up...
                  </>
                ) : (
                  'Start exploring jobs'
                )}
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
