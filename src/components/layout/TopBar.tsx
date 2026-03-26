'use client';

import { useState, useEffect } from 'react';
import type { Country } from '@/types';

// Country only controls FORMAT, not timezone.
// Timezone always comes from the user's browser.
const LOCALE_CONFIG: Record<Country, { locale: string; hour12: boolean; dateStyle: 'US' | 'IN' }> = {
  US: { locale: 'en-US', hour12: true, dateStyle: 'US' },
  IN: { locale: 'en-IN', hour12: true, dateStyle: 'IN' },
};

export function TopBar({ userName, tier, usageText, country = 'US', onSignOut }: {
  userName: string;
  tier: 'free' | 'popular' | 'pro';
  usageText?: string;
  country?: Country;
  onSignOut?: () => void;
}) {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const config = LOCALE_CONFIG[country] || LOCALE_CONFIG.US;
    // Browser's local timezone — no timeZone override means it uses system timezone
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString(config.locale, {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: config.hour12,
      }));
      setDate(now.toLocaleDateString(config.locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [country]);

  const greeting = getGreeting();

  return (
    <header className="h-[72px] px-6 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      {/* Left: Greeting + subtitle */}
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
          {greeting}, {userName}
        </h1>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Here&apos;s what&apos;s happening with your job search.
        </p>
      </div>

      {/* Right: Usage + Clock */}
      <div className="flex items-center gap-5 flex-shrink-0">
        {/* Usage badge */}
        {usageText && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
            <div className="w-1.5 h-1.5 rounded-full bg-karmio-400 animate-pulse" />
            <span className="text-xs text-slate-500 dark:text-slate-400">{usageText}</span>
          </div>
        )}

        {/* Live clock */}
        <div className="text-right hidden sm:block">
          <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono tracking-tight leading-none">
            {time}
          </p>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">{date}</p>
        </div>
      </div>
    </header>
  );
}

// Greeting based on browser's local time — no hardcoded timezone
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}