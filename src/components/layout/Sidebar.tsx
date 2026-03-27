'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Search, FileText, Users, BookOpen,
  BarChart3, CreditCard, Settings, LogOut, User, ChevronRight,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard/home', icon: LayoutDashboard, label: 'Home' },
  { href: '/dashboard/jobs/feed', icon: Search, label: 'Jobs' },
  { href: '/dashboard/resumes', icon: FileText, label: 'Resumes' },
  { href: '/dashboard/network/contacts', icon: Users, label: 'Network' },
  { href: '/dashboard/prep/hr', icon: BookOpen, label: 'Prep' },
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
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) => {
    if (href === '/dashboard/home') return pathname === '/dashboard/home' || pathname === '/dashboard';
    if (href === '/dashboard/resumes') return pathname.startsWith('/dashboard/resumes');
    return pathname.startsWith(href.replace(/\/[^/]+$/, ''));
  };

  // Close avatar menu on outside click
  useEffect(() => {
    if (!avatarMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setAvatarMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [avatarMenuOpen]);

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

      {/* Avatar with dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
          className="group"
          data-testid="sidebar-avatar"
          title={userName || 'Your profile'}
        >
          <div className={`
            w-9 h-9 rounded-full flex items-center justify-center
            text-xs font-semibold
            bg-karmio-100 dark:bg-karmio-900/50
            text-karmio-700 dark:text-karmio-300
            ring-2 ring-karmio-200 dark:ring-karmio-800/50
            transition-all duration-150
            group-hover:ring-karmio-400 dark:group-hover:ring-karmio-600
            group-hover:shadow-md group-hover:scale-105
            ${avatarMenuOpen ? 'ring-karmio-400 dark:ring-karmio-600 shadow-md scale-105' : ''}
          `}>
            {userInitials}
          </div>
        </button>

        {/* Dropdown menu */}
        {avatarMenuOpen && (
          <div className="absolute left-[52px] bottom-0 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-2 z-50 animate-fade-in">
            {/* User info */}
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
              <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{userName || 'User'}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Manage your account</p>
            </div>

            <Link href="/dashboard/profile" onClick={() => setAvatarMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <User size={14} className="text-slate-400" />
              Profile
              <ChevronRight size={12} className="ml-auto text-slate-300" />
            </Link>

            <Link href="/dashboard/settings" onClick={() => setAvatarMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <Settings size={14} className="text-slate-400" />
              Settings
              <ChevronRight size={12} className="ml-auto text-slate-300" />
            </Link>

            <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
              <button onClick={() => { setAvatarMenuOpen(false); onSignOut?.(); }}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full text-left">
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
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