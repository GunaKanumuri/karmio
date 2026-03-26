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
      <div className="flex h-screen items-center justify-center bg-white dark:bg-surface-950">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-karmio-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-surface-500">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  const displayName = user?.full_name?.split(' ')[0] || 'there';
  const displayTier = user?.subscription_tier || 'free';

  // Initials: first letter of first name + first letter of last name
  const nameParts = user?.full_name?.trim().split(/\s+/) ?? [];
  const initials = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : (nameParts[0]?.[0] ?? 'U').toUpperCase();

  // Short display: "Guna S" style
  const shortName = nameParts.length >= 2
    ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
    : nameParts[0] ?? 'You';

  // Build usage text
  const weeklyUsage = (user as any)?.weekly_usage;
  let usageText = displayTier === 'free' ? 'Free plan' : displayTier.charAt(0).toUpperCase() + displayTier.slice(1);
  if (displayTier === 'free' && weeklyUsage) {
    const appsLeft = Math.max(0, TIER_LIMITS.free.applications_per_week - (weeklyUsage.applications_count || 0));
    usageText = `${appsLeft} application${appsLeft !== 1 ? 's' : ''} left this week`;
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg-subtle)' }}>
      <div className="hidden md:block">
        <Sidebar
          userInitials={initials}
          userName={shortName}
          onSignOut={signOut}
        />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar userName={displayName} tier={displayTier} usageText={usageText} onSignOut={signOut} />
        <main className="flex-1 overflow-y-auto p-6 pb-24 md:pb-8">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}