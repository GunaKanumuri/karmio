'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';

export default function LocationPage() {
  const [country, setCountry] = useState<'US' | 'IN' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const handleContinue = async () => {
    if (!country) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country }),
      });

      if (res.status === 401) {
        setError('Session expired. Redirecting...');
        setTimeout(() => router.push('/auth-pages/login'), 1500);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error?.message || 'Could not save location.');
        setLoading(false);
        return;
      }

      router.push('/onboarding/assessment');
    } catch {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="w-8 h-8 border-2 border-karmio-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const countries = [
    { code: 'US' as const, flag: '🇺🇸', name: 'United States', desc: 'Greenhouse, Lever, USAJobs, H1B visa support' },
    { code: 'IN' as const, flag: '🇮🇳', name: 'India', desc: 'Naukri, Freshteam, Instahyre, INR pricing' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-md animate-fade-in-up">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {['Location', 'Assessment', 'Profile'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${i === 0 ? 'bg-karmio-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'
                }`}>{i + 1}</div>
              <span className={`text-xs font-medium ${i === 0 ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`}>{s}</span>
              {i < 2 && <div className="w-8 h-px bg-zinc-200 dark:bg-zinc-800" />}
            </div>
          ))}
        </div>

        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Where are you located?</h1>
          {user?.full_name && (
            <p className="text-sm text-zinc-500 mt-1">Welcome, {user.full_name.split(' ')[0]}!</p>
          )}
        </div>

        <div className="card p-4 mb-5">
          <p className="text-xs text-zinc-500 leading-relaxed">
            <strong className="text-zinc-700 dark:text-zinc-300">Why:</strong> This determines your job sources, salary formats, and pricing.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          {countries.map(loc => (
            <button
              key={loc.code}
              onClick={() => setCountry(loc.code)}
              className={`p-5 rounded-xl border-2 text-left transition-all ${country === loc.code
                  ? 'border-karmio-500 bg-karmio-50 dark:bg-karmio-900/20'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300'
                }`}
            >
              <span className="text-3xl block mb-2">{loc.flag}</span>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{loc.name}</p>
              <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{loc.desc}</p>
            </button>
          ))}
        </div>

        <Button variant="primary" fullWidth onClick={handleContinue} loading={loading} disabled={!country} size="lg">
          Continue
        </Button>

        {error && <p className="text-sm text-red-500 text-center mt-3">{error}</p>}
        <p className="text-xs text-zinc-400 text-center mt-4">You can change this later in Settings.</p>
      </div>
    </div>
  );
}