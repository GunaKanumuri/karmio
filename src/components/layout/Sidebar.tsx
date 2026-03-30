'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Search, FileText, Users, BookOpen,
  BarChart3, CreditCard, Settings, LogOut,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard/home', icon: LayoutDashboard, label: 'Home' },
  { href: '/dashboard/jobs/feed', icon: Search, label: 'Jobs' },
  { href: '/dashboard/resumes', icon: FileText, label: 'Resumes' },
  { href: '/dashboard/network/contacts', icon: Users, label: 'Network' },
  { href: '/dashboard/prep', icon: BookOpen, label: 'Prep' },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
];

const BOTTOM_ITEMS = [
  { href: '/dashboard/subscription', icon: CreditCard, label: 'Plan' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
  userInitials?: string;
  userName?: string;
  onSignOut?: () => void;
}

export function Sidebar({ userInitials = 'U', userName, onSignOut }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard/home') return pathname === '/dashboard/home' || pathname === '/dashboard';
    if (href === '/dashboard/resumes') return pathname.startsWith('/dashboard/resumes');
    return pathname.startsWith(href.replace(/\/[^/]+$/, ''));
  };

  const profileActive = pathname.startsWith('/dashboard/profile');

  return (
    <aside className="w-[72px] h-screen flex flex-col items-center py-5 gap-1 border-r border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-950 flex-shrink-0">
      {/* Logo */}
      <Link href="/dashboard/home" className="mb-6" data-testid="sidebar-logo">
        <div className="w-10 h-10 rounded-xl bg-karmio-500 flex items-center justify-center shadow-sm shadow-karmio-500/20">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
      </Link>

      {/* Main nav */}
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </nav>

      <div className="flex-1" />

      {/* Bottom nav */}
      <nav className="flex flex-col gap-1">
        {BOTTOM_ITEMS.map((item) => (
          <NavItem key={item.href + item.label} item={item} active={isActive(item.href)} />
        ))}
      </nav>

      <div className="w-8 h-px bg-slate-200 dark:bg-slate-700 my-1" />

      {/* Avatar — direct link to profile page */}
      <Link
        href="/dashboard/profile"
        className="group relative"
        data-testid="sidebar-avatar"
        title={userName || 'Your profile'}
      >
        <div className={`
          w-9 h-9 rounded-full flex items-center justify-center
          text-xs font-semibold
          bg-karmio-100 dark:bg-karmio-900/50
          text-karmio-700 dark:text-karmio-300
          ring-2 transition-all duration-150
          group-hover:shadow-md group-hover:scale-105
          ${profileActive
            ? 'ring-karmio-500 dark:ring-karmio-500 shadow-md scale-105'
            : 'ring-karmio-200 dark:ring-karmio-800/50 group-hover:ring-karmio-400 dark:group-hover:ring-karmio-600'
          }
        `}>
          {userInitials}
        </div>
        <span className="absolute left-[56px] top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-900 dark:bg-surface-100 text-white dark:text-surface-900 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
          Profile
        </span>
      </Link>

      {/* Sign out button */}
      <button
        onClick={onSignOut}
        className="group relative mt-1"
        data-testid="sidebar-signout"
        title="Sign out"
      >
        <div className="w-10 h-10 flex items-center justify-center rounded-xl transition-all text-surface-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500">
          <LogOut size={18} strokeWidth={1.5} />
        </div>
        <span className="absolute left-[56px] top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-900 dark:bg-surface-100 text-white dark:text-surface-900 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
          Sign out
        </span>
      </button>
    </aside>
  );
}

function NavItem({ item, active }: { item: { href: string; icon: any; label: string }; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className="group relative" data-testid={`nav-${item.label.toLowerCase()}`}>
      <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
        active
          ? 'bg-karmio-50 dark:bg-karmio-900/30 text-karmio-600 dark:text-karmio-400 shadow-sm'
          : 'text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-600 dark:hover:text-surface-300'
      }`}>
        <Icon size={18} strokeWidth={1.5} />
      </div>
      <span className="absolute left-[56px] top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-900 dark:bg-surface-100 text-white dark:text-surface-900 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
        {item.label}
      </span>
    </Link>
  );
}