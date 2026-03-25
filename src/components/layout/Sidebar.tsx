'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { clsx } from 'clsx';
import {
  LayoutDashboard, Search, FileText, Users, BookOpen,
  BarChart3, CreditCard, Settings, LogOut
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard/home', icon: LayoutDashboard, label: 'Home', group: null },
  { href: '/dashboard/jobs/feed', icon: Search, label: 'Jobs', group: 'Search' },
  { href: '/dashboard/resumes/profile', icon: FileText, label: 'Resumes', group: 'Build' },
  { href: '/dashboard/network/contacts', icon: Users, label: 'Network', group: 'Connect' },
  { href: '/dashboard/prep/hr', icon: BookOpen, label: 'Prep', group: 'Prepare' },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics', group: 'Insights' },
];

const BOTTOM_ITEMS = [
  { href: '/dashboard/subscription', icon: CreditCard, label: 'Subscription' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar({ userInitials = 'U', onSignOut }: { userInitials?: string; onSignOut?: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard/home') return pathname === '/dashboard/home' || pathname === '/dashboard';
    return pathname.startsWith(href.replace(/\/[^/]+$/, ''));
  };

  return (
    <aside className="w-[68px] h-screen flex flex-col items-center py-4 gap-1 border-r border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 flex-shrink-0">
      {/* Logo */}
      <Link href="/dashboard/home" className="mb-4">
        <div className="w-9 h-9 rounded-lg bg-karmio-500 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
      </Link>

      {/* Main nav */}
      {NAV_ITEMS.map((item) => (
        <NavIcon key={item.href} item={item} active={isActive(item.href)} />
      ))}

      <div className="flex-1" />

      {/* Bottom nav */}
      {BOTTOM_ITEMS.map((item) => (
        <NavIcon key={item.href} item={item} active={isActive(item.href)} />
      ))}

      {/* Logout button */}
      <button
        onClick={onSignOut}
        className="group relative"
        title="Sign out"
      >
        <div className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400">
          <LogOut size={18} strokeWidth={1.5} />
        </div>
        <span className="absolute left-[52px] top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md text-xs font-medium
          bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900
          opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
          Sign out
        </span>
      </button>

      {/* User avatar */}
      <div className="mt-2 w-8 h-8 rounded-full bg-karmio-100 dark:bg-karmio-900 flex items-center justify-center text-xs font-medium text-karmio-700 dark:text-karmio-300">
        {userInitials}
      </div>
    </aside>
  );
}

function NavIcon({ item, active }: {
  item: { href: string; icon: any; label: string };
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className="group relative">
      <div className={clsx(
        'w-10 h-10 flex items-center justify-center rounded-lg transition-colors',
        active
          ? 'bg-karmio-50 dark:bg-karmio-900/40 text-karmio-600 dark:text-karmio-400'
          : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300'
      )}>
        <Icon size={18} strokeWidth={1.5} />
      </div>
      <span className="absolute left-[52px] top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md text-xs font-medium
        bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900
        opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
        {item.label}
      </span>
    </Link>
  );
}
