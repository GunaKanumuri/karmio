'use client';

import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { useAuth } from '@/hooks/useAuth';
import { TIER_LIMITS } from '@/lib/constants';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-karmio-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  const displayName = user?.full_name?.split(' ')[0] || 'there';
  const displayTier = user?.subscription_tier || 'free';
  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  // Build usage text from tier
  const tierLabel = displayTier.charAt(0).toUpperCase() + displayTier.slice(1);
  const weeklyUsage = (user as any)?.weekly_usage;
  let usageText = `${tierLabel} plan`;
  if (displayTier === 'free' && weeklyUsage) {
    const appsLeft = Math.max(0, TIER_LIMITS.free.applications_per_week - (weeklyUsage.applications_count || 0));
    usageText = `Free plan — ${appsLeft} app${appsLeft !== 1 ? 's' : ''} left this week`;
  } else if (displayTier === 'free') {
    usageText = 'Free plan';
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="hidden md:block">
        <Sidebar userInitials={initials} onSignOut={signOut} />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar userName={displayName} tier={displayTier} usageText={usageText} onSignOut={signOut} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
