import { clsx } from 'clsx';

export function WhyHelper({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx(
      'bg-slate-50 dark:bg-slate-800/50 rounded-lg px-4 py-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed',
      className
    )}>
      {children}
    </div>
  );
}

export function ErrorMessage({ title, message, action, onRetry }: {
  title: string; message: string; action?: string; onRetry?: () => void;
}) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
      <p className="text-sm font-medium text-red-700 dark:text-red-300">{title}</p>
      <p className="text-sm text-red-600 dark:text-red-400 mt-1">{message}</p>
      {action && <p className="text-sm text-red-500 dark:text-red-400 mt-2 italic">{action}</p>}
      {onRetry && (
        <button onClick={onRetry}
          className="mt-3 text-sm font-medium text-red-700 dark:text-red-300 underline hover:no-underline">
          Try again
        </button>
      )}
    </div>
  );
}

export function UpgradePrompt({ feature, tierNeeded = 'Popular' }: {
  feature: string; tierNeeded?: string;
}) {
  return (
    <div className="bg-karmio-50 dark:bg-karmio-900/20 border border-karmio-200 dark:border-karmio-800 rounded-xl p-4 text-center">
      <p className="text-sm font-medium text-karmio-700 dark:text-karmio-300">
        {feature} requires the {tierNeeded} plan
      </p>
      <p className="text-xs text-karmio-500 mt-1">
        Upgrade to unlock this feature and supercharge your job search.
      </p>
      <a href="/dashboard/subscription"
        className="inline-block mt-3 px-4 py-1.5 bg-karmio-500 text-white text-sm font-medium rounded-lg hover:bg-karmio-600 transition-colors">
        View plans
      </a>
    </div>
  );
}

export function QualityGate({ message, alternatives }: {
  message: string; alternatives?: number;
}) {
  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 mt-2">
      <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">{message}</p>
      {alternatives && alternatives > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
          We found {alternatives} better-fit alternatives for your profile.
        </p>
      )}
    </div>
  );
}

export function Skeleton({ className, lines = 1 }: { className?: string; lines?: number }) {
  return (
    <div className={clsx('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={clsx('skeleton rounded h-4', i === lines - 1 && lines > 1 && 'w-3/4')} />
      ))}
    </div>
  );
}
