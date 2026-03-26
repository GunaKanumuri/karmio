'use client';

import { useState, useEffect } from 'react';

export function TopBar({ userName, tier, usageText, onSignOut }: {
  userName: string;
  tier: 'free' | 'popular' | 'pro';
  usageText?: string;
  onSignOut?: () => void;
}) {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }));
      setDate(now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const greeting = getGreeting();

  return (
    <header className="h-[72px] px-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800" style={{ background: 'var(--color-bg-card, #fff)' }}>
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

        {/* Live clock — bold and clean */}
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

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}