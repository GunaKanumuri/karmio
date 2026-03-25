'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function VerifyPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'loading' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your account...');
  const [errorDetails, setErrorDetails] = useState('');

  useEffect(() => {
    const verify = async () => {
      const supabase = createClient();

      try {
        // First, check if we have hash params (email verification redirect)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (accessToken && refreshToken) {
          // Set session from hash params (email verification flow)
          const { data: setData, error: setError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (setError) {
            console.error('[Verify] Set session error:', setError);
            setStatus('error');
            setMessage('Verification failed');
            setErrorDetails(setError.message);
            return;
          }

          if (setData.session) {
            setStatus('loading');
            setMessage('Loading your profile...');
          }
        }

        // Check for existing session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !sessionData.session) {
          // Try to refresh session
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError || !refreshData.session) {
            setStatus('error');
            setMessage('Session expired');
            setErrorDetails('Please sign in again to continue.');
            setTimeout(() => router.push('/auth-pages/login'), 2000);
            return;
          }
        }

        // Fetch user profile to determine redirect
        setStatus('loading');
        setMessage('Loading your profile...');

        const res = await fetch('/api/auth', { 
          credentials: 'include',
          cache: 'no-store',
        });
        const json = await res.json();

        if (json.success && json.data) {
          setStatus('success');
          const destination = json.data.onboarding_complete 
            ? '/dashboard/home' 
            : '/onboarding/location';
          setMessage(json.data.onboarding_complete ? 'Welcome back!' : 'Setting up your profile...');
          
          setTimeout(() => router.push(destination), 800);
        } else {
          // Profile doesn't exist yet, go to onboarding
          setStatus('success');
          setMessage('Setting up your profile...');
          setTimeout(() => router.push('/onboarding/location'), 800);
        }
      } catch (err) {
        console.error('[Verify] Error:', err);
        setStatus('error');
        setMessage('Something went wrong');
        setErrorDetails('Please try signing in again.');
      }
    };

    verify();
  }, [router]);

  const steps = ['Verify', 'Load profile', 'Redirect'];
  const currentStep = status === 'verifying' ? 0 : status === 'loading' ? 1 : 2;

  return (
    <div className="auth-page">
      <div className="text-center animate-fade-in-up">
        <div className="card-elevated p-10 w-[320px]">
          {status === 'error' ? (
            <>
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M15 9l-6 6M9 9l6 6" />
                </svg>
              </div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{message}</p>
              {errorDetails && (
                <p className="text-xs text-zinc-500 mt-2">{errorDetails}</p>
              )}
              <Link 
                href="/auth-pages/login" 
                className="inline-block mt-4 text-sm text-karmio-500 font-medium hover:text-karmio-600"
              >
                Back to sign in
              </Link>
            </>
          ) : status === 'success' ? (
            <>
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{message}</p>
            </>
          ) : (
            <>
              <div className="w-10 h-10 border-[2.5px] border-karmio-500 border-t-transparent rounded-full animate-spin mx-auto mb-5" />
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{message}</p>
            </>
          )}

          <div className="flex items-center justify-center gap-1.5 mt-5">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i <= currentStep 
                    ? (status === 'error' ? 'bg-red-500' : 'bg-karmio-500') 
                    : 'bg-zinc-200 dark:bg-zinc-700'
                }`} />
                {i < steps.length - 1 && (
                  <div className={`w-5 h-px transition-colors ${
                    i < currentStep 
                      ? (status === 'error' ? 'bg-red-500' : 'bg-karmio-500') 
                      : 'bg-zinc-200 dark:bg-zinc-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
