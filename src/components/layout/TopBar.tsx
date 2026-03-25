'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
    <header className="h-[72px] px-6 flex items-center justify-between border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-950">
      {/* Left: Greeting + subtitle */}
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
          {greeting}, {userName}
        </h1>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Here&apos;s what&apos;s happening with your job search.
        </p>
      </div>

      {/* Right: Clock + usage + upgrade */}
      <div className="flex items-center gap-5 flex-shrink-0">
        {/* Usage badge */}
        {usageText && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
            <div className="w-1.5 h-1.5 rounded-full bg-karmio-400 animate-pulse" />
            <span className="text-xs text-slate-500 dark:text-slate-400">{usageText}</span>
          </div>
        )}

        {/* Upgrade CTA */}
        {tier === 'free' && (
          <Link
            href="/dashboard/subscription"
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-karmio-500 rounded-lg hover:bg-karmio-600 active:scale-[0.97] transition-all shadow-sm shadow-karmio-500/20"
            data-testid="topbar-upgrade"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Upgrade
          </Link>
        )}

        {/* Live clock */}
        <div className="text-right hidden sm:block">
          <p className="text-base font-medium text-slate-900 dark:text-white font-mono tracking-tight leading-tight">
            {time}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{date}</p>
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