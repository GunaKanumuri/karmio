'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
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
                setError(json.error?.message || 'Something went wrong.');
                setLoading(false);
                return;
            }

            setSent(true);
            setLoading(false);
        } catch {
            setError('Connection error. Please try again.');
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <div className="auth-page">
                <div className="w-full max-w-[400px] animate-fade-in-up text-center">
                    <div className="card-elevated p-8">
                        <div className="w-14 h-14 rounded-full bg-karmio-50 dark:bg-karmio-900/30 flex items-center justify-center mx-auto mb-4">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-karmio-500">
                                <rect x="2" y="4" width="20" height="16" rx="2" />
                                <path d="M22 7l-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Check your email</h1>
                        <p className="text-sm text-zinc-500 mt-2">
                            If an account exists for <strong className="text-zinc-700 dark:text-zinc-300">{email}</strong>,
                            we&apos;ve sent a password reset link.
                        </p>
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
                <div className="text-center mb-8">
                    <Link href="/auth-pages/login" className="inline-flex items-center gap-2 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-karmio-500 flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Karmio</span>
                    </Link>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Reset your password</h1>
                    <p className="text-sm text-zinc-500 mt-1">Enter the email on your account and we&apos;ll send a reset link.</p>
                </div>

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
                        />

                        {error && (
                            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3 animate-fade-in">
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                            </div>
                        )}

                        <Button type="submit" variant="primary" fullWidth loading={loading} size="lg">
                            Send reset link
                        </Button>
                    </form>
                </div>

                <p className="text-center text-sm text-zinc-500 mt-6">
                    Remembered your password?{' '}
                    <Link href="/auth-pages/login" className="text-karmio-500 font-medium hover:text-karmio-600 transition-colors">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
