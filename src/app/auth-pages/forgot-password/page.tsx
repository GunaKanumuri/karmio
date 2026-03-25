'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const json = await res.json();

      if (!json.success) {
        setError(json.error?.message || 'Could not send reset link.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="w-full max-w-[400px] animate-fade-in-up text-center">
          <div className="card-elevated p-8">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Check your email</h1>
            <p className="text-sm text-zinc-500 mt-2">
              If an account exists for <strong className="text-zinc-700 dark:text-zinc-300">{email}</strong>, 
              we&apos;ve sent a password reset link.
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
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Reset your password</h1>
          <p className="text-sm text-zinc-500 mt-1">Enter your email and we&apos;ll send you a reset link</p>
        </div>

        {/* Card */}
        <div className="card-elevated p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
              autoComplete="email"
              data-testid="forgot-password-email"
            />

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3 animate-fade-in">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <Button 
              type="submit" 
              variant="primary" 
              fullWidth 
              loading={loading} 
              size="lg"
              data-testid="forgot-password-submit"
            >
              Send reset link
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-zinc-500 mt-6">
          Remember your password?{' '}
          <Link href="/auth-pages/login" className="text-karmio-500 font-medium hover:text-karmio-600 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
