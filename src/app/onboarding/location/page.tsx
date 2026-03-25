'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸', desc: 'H1B sponsorship filters, USD salaries' },
  { code: 'IN', name: 'India', flag: '🇮🇳', desc: 'INR salaries, local job boards' },
];

export default function LocationPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleContinue = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: selected }),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message || 'Could not save. Please try again.');
        setSaving(false);
        return;
      }

      router.push('/onboarding/assessment');
    } catch {
      setError('Connection error. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-surface-950 flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-surface-100 dark:bg-surface-800">
        <div className="h-full bg-karmio-500 transition-all duration-500" style={{ width: '33%' }} />
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
        <div className="text-sm text-surface-500">Step 1 of 3</div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg animate-slide-up">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-semibold text-surface-900 dark:text-white mb-3">Where are you looking for work?</h1>
            <p className="text-surface-600 dark:text-surface-400">
              This helps us show relevant jobs, salary ranges, and visa information.
            </p>
          </div>

          <div className="space-y-4 mb-8">
            {COUNTRIES.map((country) => (
              <button
                key={country.code}
                onClick={() => setSelected(country.code)}
                className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${
                  selected === country.code
                    ? 'border-karmio-500 bg-karmio-50 dark:bg-karmio-900/20'
                    : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600 bg-white dark:bg-surface-900'
                }`}
                data-testid={`country-${country.code}`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{country.flag}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-medium text-surface-900 dark:text-white">{country.name}</span>
                      {selected === country.code && (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-karmio-500">
                          <circle cx="12" cy="12" r="10" fill="currentColor" />
                          <path d="M8 12l3 3 5-6" stroke="white" strokeWidth="2" />
                        </svg>
                      )}
                    </div>
                    <p className="text-sm text-surface-500 mt-0.5">{country.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 mb-6 animate-fade-in">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <button
            onClick={handleContinue}
            disabled={!selected || saving}
            className="btn btn-primary btn-lg w-full disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="location-continue"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Continue'
            )}
          </button>

          <p className="text-center text-sm text-surface-500 mt-6">
            You can change this later in settings
          </p>
        </div>
      </main>
    </div>
  );
}
