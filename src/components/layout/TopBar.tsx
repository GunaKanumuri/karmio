'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { LogOut, ChevronDown, Settings, User } from 'lucide-react';

export function TopBar({ userName, tier, usageText, onSignOut }: {
  userName: string;
  tier: 'free' | 'popular' | 'pro';
  usageText?: string;
  onSignOut?: () => void;
}) {
  const [date, setDate] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDate(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="h-16 px-6 flex items-center justify-between border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-950">
      <div>
        <p className="text-sm text-surface-500">{date}</p>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Usage badge */}
        {usageText && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-100 dark:bg-surface-800">
            <span className="text-xs text-surface-500">{usageText}</span>
          </div>
        )}

        {/* Upgrade CTA */}
        {tier === 'free' && (
          <Link
            href="/dashboard/subscription"
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-karmio-500 rounded-lg hover:bg-karmio-600 transition-colors"
            data-testid="topbar-upgrade"
          >
            Upgrade
          </Link>
        )}

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            data-testid="topbar-user-menu"
          >
            <span className="text-sm font-medium text-surface-700 dark:text-surface-300">{userName}</span>
            <ChevronDown size={14} className={`text-surface-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl shadow-lg z-50 py-1 animate-scale-in origin-top-right">
              <Link
                href="/dashboard/resumes/profile"
                className="flex items-center gap-3 px-4 py-3 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                <User size={16} className="text-surface-400" />
                My profile
              </Link>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-3 px-4 py-3 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                <Settings size={16} className="text-surface-400" />
                Settings
              </Link>
              <div className="border-t border-surface-100 dark:border-surface-800 my-1" />
              <button
                onClick={() => { setMenuOpen(false); onSignOut?.(); }}
                className="flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left transition-colors"
                data-testid="topbar-signout"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
