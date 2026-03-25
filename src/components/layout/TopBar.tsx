'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { LogOut, ChevronDown } from 'lucide-react';

export function TopBar({ userName, tier, usageText, onSignOut }: {
  userName: string;
  tier: 'free' | 'popular' | 'pro';
  usageText?: string;
  onSignOut?: () => void;
}) {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <header className="h-16 px-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900">
      <div>
        <h1 className="text-base font-medium text-slate-900 dark:text-white">
          {greeting()}, {userName || 'there'}
        </h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{date}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-lg font-medium text-slate-900 dark:text-white font-mono tracking-tight">{time}</p>
          {usageText && <p className="text-[11px] text-slate-400">{usageText}</p>}
        </div>
        {tier === 'free' && (
          <Link href="/dashboard/subscription">
            <Button variant="primary" size="sm">Upgrade</Button>
          </Link>
        )}

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="text-sm text-slate-600 dark:text-slate-300 hidden sm:inline">{userName}</span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 py-1">
              <Link
                href="/dashboard/resumes/profile"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={() => setMenuOpen(false)}
              >
                My profile
              </Link>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={() => setMenuOpen(false)}
              >
                Settings
              </Link>
              <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
              <button
                onClick={() => { setMenuOpen(false); onSignOut?.(); }}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
