import { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

export function Card({ hoverable, padding = 'md', className, children, ...props }: CardProps) {
  const paddings = { sm: 'p-3', md: 'p-4', lg: 'p-5' };
  return (
    <div
      className={clsx(
        'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl',
        paddings[padding],
        hoverable && 'transition-colors hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function MetricCard({ label, value, change, changeType }: {
  label: string; value: string | number; change?: string; changeType?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-medium text-slate-900 dark:text-white">{value}</p>
      {change && (
        <p className={clsx('text-xs mt-1', {
          'text-emerald-600 dark:text-emerald-400': changeType === 'up',
          'text-red-500': changeType === 'down',
          'text-slate-500': changeType === 'neutral',
        })}>
          {changeType === 'up' && '+'}{change}
        </p>
      )}
    </div>
  );
}
