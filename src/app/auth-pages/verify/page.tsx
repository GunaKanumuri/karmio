'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function VerifyPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Verifying your account...');
  const [step, setStep] = useState(0);

  useEffect(() => {
    const verify = async () => {
      const supabase = createClient();
      let session = null;

      const { data } = await supabase.auth.getSession();
      session = data.session;

      if (!session) {
        const { data: refreshData } = await supabase.auth.refreshSession();
        session = refreshData.session;
      }

      if (!session) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) {
          const { data: setData } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          session = setData.session;
        }
      }

      if (!session) {
        setStatus('Could not verify session. Redirecting...');
        setTimeout(() => router.push('/auth-pages/login'), 1500);
        return;
      }

      setStep(1);
      setStatus('Loading your profile...');

      try {
        const res = await fetch('/api/auth', { credentials: 'include' });
        const json = await res.json();

        if (json.success && json.data) {
          setStep(2);
          const destination = json.data.onboarding_complete ? '/dashboard/home' : '/onboarding/location';
          setStatus(json.data.onboarding_complete ? 'Welcome back!' : 'Setting up your profile...');
          setTimeout(() => router.push(destination), 500);
        } else {
          setStep(2);
          setTimeout(() => router.push('/onboarding/location'), 500);
        }
      } catch {
        router.push('/onboarding/location');
      }
    };

    verify();
  }, [router]);

  const steps = ['Verify', 'Load profile', 'Redirect'];

  return (
    <div className="auth-page">
      <div className="text-center animate-fade-in-up">
        <div className="card-elevated p-10 w-[300px]">
          <div className="w-10 h-10 border-[2.5px] border-karmio-500 border-t-transparent rounded-full animate-spin mx-auto mb-5" />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{status}</p>

          <div className="flex items-center justify-center gap-1.5 mt-5">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${i <= step ? 'bg-karmio-500' : 'bg-zinc-200 dark:bg-zinc-700'
                  }`} />
                {i < steps.length - 1 && (
                  <div className={`w-5 h-px transition-colors ${i < step ? 'bg-karmio-500' : 'bg-zinc-200 dark:bg-zinc-700'
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