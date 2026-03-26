'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });

      const json = await res.json();

      if (!json.success) {
        const code = json.error?.code;
        if (code === 'AUTH_EMAIL_EXISTS') {
          setError('An account with this email already exists. Try signing in instead.');
        } else if (code === 'AUTH_WEAK_PASSWORD') {
          setError('Please choose a stronger password.');
        } else {
          setError(json.error?.message || 'Could not create account. Please try again.');
        }
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError('Connection error. Please check your internet and try again.');
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth-pages/callback` },
      });
      if (oauthError) {
        setError(oauthError.message);
        setGoogleLoading(false);
      }
    } catch {
      setError('Could not connect to Google. Please try again.');
      setGoogleLoading(false);
    }
  };

  if (success) {
    return (
      <div className="page-auth">
        <div className="w-full max-w-[420px] text-center animate-slide-up">
          <div className="card-elevated">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <path d="M22 4L12 14.01l-3-3" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-surface-900 dark:text-white mb-3">Check your email</h1>
            <p className="text-surface-600 dark:text-surface-400 mb-2">
              We sent a verification link to <strong className="text-surface-900 dark:text-white">{email}</strong>
            </p>
            <p className="text-sm text-surface-500 mb-6">
              Click the link in the email to activate your account. Check your spam folder if you do not see it.
            </p>
            <Link href="/auth-pages/login" className="btn btn-secondary w-full">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-auth">
      <div className="w-full max-w-[420px] animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-karmio-500 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-surface-900 dark:text-white">Karmio</span>
          </Link>
          <h1 className="text-2xl font-semibold text-surface-900 dark:text-white mb-2">Create your account</h1>
          <p className="text-surface-500">Start your job search in under 3 minutes</p>
        </div>

        {/* Card */}
        <div className="card-elevated">
          {/* Google button */}
          <button
            onClick={handleGoogleSignup}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-surface-700 dark:text-surface-200 font-medium hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            data-testid="google-signup-btn"
          >
            {googleLoading ? (
              <div className="w-5 h-5 border-2 border-surface-300 border-t-surface-600 rounded-full animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            {googleLoading ? 'Connecting...' : 'Continue with Google'}
          </button>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-surface-200 dark:bg-surface-700" />
            <span className="text-sm text-surface-400">or</span>
            <div className="flex-1 h-px bg-surface-200 dark:bg-surface-700" />
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="input-label">Full name</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Jane Doe"
                required
                autoComplete="name"
                className="input-field"
                data-testid="signup-name"
              />
            </div>

            <div>
              <label htmlFor="email" className="input-label">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="input-field"
                data-testid="signup-email"
              />
            </div>

            <div>
              <label htmlFor="password" className="input-label">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  autoComplete="new-password"
                  className="input-field pr-12"
                  data-testid="signup-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors"
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Password strength */}
              {password.length > 0 && (
                <div className="mt-3 animate-fade-in">
                  <div className="flex gap-1.5 mb-2">
                    {[1, 2, 3, 4].map(level => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${passwordStrength >= level
                            ? passwordStrength <= 1 ? 'bg-red-500'
                              : passwordStrength <= 2 ? 'bg-amber-500'
                                : passwordStrength <= 3 ? 'bg-emerald-400'
                                  : 'bg-emerald-500'
                            : 'bg-surface-200 dark:bg-surface-700'
                          }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-surface-500">
                    {passwordStrength <= 1 && 'Weak password'}
                    {passwordStrength === 2 && 'Fair password'}
                    {passwordStrength === 3 && 'Good password'}
                    {passwordStrength >= 4 && 'Strong password'}
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 animate-fade-in">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg w-full"
              data-testid="signup-submit"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="text-xs text-center text-surface-400 mt-4">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-surface-500 mt-8">
          Already have an account?{' '}
          <Link href="/auth-pages/login" className="text-karmio-500 font-medium hover:text-karmio-600 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function getPasswordStrength(password: string): number {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  return Math.min(4, strength);
}
