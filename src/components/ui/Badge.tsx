'use client';

import { clsx } from 'clsx';
import { useEffect, useState } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'brand';

const badgeStyles: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  danger: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  info: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  purple: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
  brand: 'bg-karmio-50 text-karmio-700 border-karmio-200 dark:bg-karmio-900/30 dark:text-karmio-300 dark:border-karmio-800',
};

export function Badge({ children, variant = 'default', className }: {
  children: React.ReactNode; variant?: BadgeVariant; className?: string;
}) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border',
      badgeStyles[variant], className
    )}>
      {children}
    </span>
  );
}

export function MatchRing({ score, size = 44, showLabel = false }: { score: number; size?: number; showLabel?: boolean }) {
  const [animScore, setAnimScore] = useState(0);
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const timer = setTimeout(() => setAnimScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const progress = (animScore / 100) * circumference;

  const strokeColor = score >= 80 ? '#059669' : score >= 60 ? '#1A56DB' : score >= 40 ? '#D97706' : '#DC2626';
  const textColor = score >= 80 ? 'text-emerald-600 dark:text-emerald-400'
    : score >= 60 ? 'text-karmio-600 dark:text-karmio-400'
    : score >= 40 ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400';
  const bgFill = score >= 80 ? '#ECFDF5' : score >= 60 ? '#EEF4FF' : score >= 40 ? '#FFFBEB' : '#FEF2F2';
  const label = score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 45 ? 'Fair' : 'Low';

  return (
    <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={radius}
            fill={bgFill}
            className="stroke-slate-200 dark:stroke-slate-700"
            strokeWidth="3"
          />
          <circle cx={size/2} cy={size/2} r={radius} fill="none"
            stroke={strokeColor} strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
        <div className={clsx('absolute inset-0 flex items-center justify-center text-xs font-semibold', textColor)}>
          {animScore}%
        </div>
      </div>
      {showLabel && (
        <span className={clsx('text-[9px] font-semibold tracking-wide', textColor)}>
          {label}
        </span>
      )}
    </div>
  );
}

export function AIBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="6" /><path d="M8 5v3l2 2" />
      </svg>
      AI-enhanced
    </span>
  );
}