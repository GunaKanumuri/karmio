'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', pass: password.length >= 8 },
    { label: 'Includes a letter', pass: /[a-zA-Z]/.test(password) },
    { label: 'Includes a number', pass: /[0-9]/.test(password) },
  ];
  const strength = checks.filter(c => c.pass).length;
  const barColors = ['', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500'];

  if (!password) return null;

  return (
    <div className="animate-fade-in space-y-2 pt-1">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < strength ? barColors[strength] : 'bg-zinc-200 dark:bg-zinc-700'
            }`} />
        ))}
      </div>
      <div className="space-y-0.5">
        {checks.map((check, i) => (
          <p key={i} className={`text-xs flex items-center gap-1.5 ${check.pass ? 'text-emerald-600' : 'text-zinc-400'}`}>
            {check.pass ? '✓' : '○'} {check.label}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [errorAction, setErrorAction] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setErrorAction('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });

      const json = await res.json();

      if (!json.success) {
        setError(json.error?.message || 'Could not create account.');
        setErrorAction(json.error?.action || '');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch {
      setError('Connection error. Please check your internet and try again.');
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth-pages/callback` },
    });
  };

  // Success state
  if (success) {
    return (
      <div className="auth-page">
        <div className="w-full max-w-[400px] animate-fade-in-up text-center">
          <div className="card-elevated p-8">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 52 52" className="text-emerald-500">
                <circle className="checkmark-circle" cx="26" cy="26" r="24" fill="none" stroke="currentColor" strokeWidth="2" />
                <path className="checkmark-check" fill="none" stroke="currentColor" strokeWidth="3" d="M14 27l7 7 16-16" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Check your email</h1>
            <p className="text-sm text-zinc-500 mt-2">
              We sent a verification link to <strong className="text-zinc-700 dark:text-zinc-300">{email}</strong>.
            </p>
            <div className="mt-4 p-3 rounded-lg bg-karmio-50 dark:bg-karmio-900/20 border border-karmio-200 dark:border-karmio-800/30">
              <p className="text-xs text-karmio-600 dark:text-karmio-400">
                Check spam if you don&apos;t see it within 2 minutes.
              </p>
            </div>
            <Link href="/auth-pages/login" className="inline-block mt-5 text-sm text-karmio-500 font-medium hover:text-karmio-600">
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="w-full max-w-[400px] animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
            <div className="w-10 h-10 rounded-xl bg-karmio-500 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Karmio</span>
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Create your account</h1>
          <p className="text-sm text-zinc-500 mt-1">Free forever. Start building your career today.</p>
        </div>

        {/* Card */}
        <div className="card-elevated p-6">
          {/* Google */}
          <button
            onClick={handleGoogleSignup}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors active:scale-[0.99]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign up with Google
          </button>

          <div className="divider my-5">or</div>

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            <Input label="Full name" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Alex Johnson" required autoComplete="name" />
            <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required autoComplete="email" />

            <div className="space-y-1">
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[34px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3 animate-fade-in">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                {errorAction && <p className="text-xs text-red-500/80 mt-0.5">{errorAction}</p>}
              </div>
            )}

            <Button type="submit" variant="primary" fullWidth loading={loading} size="lg">
              Create account
            </Button>
          </form>

          <p className="text-[11px] text-zinc-400 text-center mt-4">
            By signing up, you agree to our Terms and Privacy Policy.
          </p>
        </div>

        <p className="text-center text-sm text-zinc-500 mt-6">
          Already have an account?{' '}
          <Link href="/auth-pages/login" className="text-karmio-500 font-medium hover:text-karmio-600 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
