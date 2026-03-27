'use client';

import { useState, useEffect } from 'react';
import { useTodayJobStats } from '@/hooks/useJobs';
import { Loader2, Sparkles, RefreshCw } from 'lucide-react';

export function LiveFetchCounter() {
  const { data: stats, isLoading, dataUpdatedAt } = useTodayJobStats();
  const [pulse, setPulse] = useState(false);
  const [prevCount, setPrevCount] = useState(0);

  const totalToday = stats?.total_today || 0;
  const lastFetch = stats?.last_fetch;

  // Pulse animation when count changes
  useEffect(() => {
    if (totalToday > prevCount && prevCount > 0) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 2000);
      return () => clearTimeout(timer);
    }
    setPrevCount(totalToday);
  }, [totalToday, prevCount]);

  // Format last fetch time
  const lastFetchLabel = lastFetch
    ? formatTimeAgo(new Date(lastFetch))
    : 'Not yet today';

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
      pulse
        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50'
    }`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
        pulse
          ? 'bg-emerald-100 dark:bg-emerald-800/40'
          : 'bg-karmio-100 dark:bg-karmio-800/40'
      }`}>
        {isLoading ? (
          <Loader2 size={14} className="text-karmio-500 animate-spin" />
        ) : pulse ? (
          <Sparkles size={14} className="text-emerald-500 animate-pulse" />
        ) : (
          <RefreshCw size={14} className="text-karmio-500" />
        )}
      </div>

      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className={`text-lg font-semibold transition-colors ${
            pulse ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
          }`}>
            {totalToday}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            jobs fetched today
          </span>
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Last fetch: {lastFetchLabel} · Updates every 2 hours
        </p>
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}