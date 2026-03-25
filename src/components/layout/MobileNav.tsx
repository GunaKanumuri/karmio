'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Search, FileText, Users, BarChart3 } from 'lucide-react';
import { clsx } from 'clsx';

const TABS = [
  { href: '/dashboard/home', icon: LayoutDashboard, label: 'Home' },
  { href: '/dashboard/jobs/feed', icon: Search, label: 'Jobs' },
  { href: '/dashboard/resumes/tailored', icon: FileText, label: 'Resumes' },
  { href: '/dashboard/network/contacts', icon: Users, label: 'Network' },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'More' },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700/50 z-40">
      <div className="flex items-center justify-around py-2">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href.replace(/\/[^/]+$/, '')) || pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link key={tab.href} href={tab.href} className="flex flex-col items-center gap-0.5 px-3 py-1">
              <Icon size={20} strokeWidth={1.5} className={clsx(active ? 'text-karmio-500' : 'text-slate-400')} />
              <span className={clsx('text-[10px]', active ? 'text-karmio-600 font-medium' : 'text-slate-400')}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
