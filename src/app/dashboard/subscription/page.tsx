'use client';

import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { WhyHelper } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';

const PLANS = [
  {
    name: 'Free', key: 'free', price: '$0', period: 'forever',
    features: [
      'All features included (AI resume, cover letter, networking)',
      '5 applications per week',
      '1 target profile',
      'Word export only',
      'Basic analytics',
    ],
  },
  {
    name: 'Popular', key: 'popular', price: '$9', period: '/month billed yearly', highlight: true,
    features: [
      'Unlimited applications',
      '2 target profiles',
      'Word + PDF + LaTeX export',
      'Google Calendar sync',
      'Full analytics with weekly graphs',
      'All resume versions',
      'Daily briefing + Power hour mode',
      'Full email notifications',
    ],
  },
  {
    name: 'Pro', key: 'pro', price: '$15', period: '/month billed yearly',
    features: [
      'Everything in Popular',
      'Unlimited target profiles',
      'AI interview prep + mock interviews',
      'Priority job alerts (within minutes)',
      'Warm path finder',
      'Salary intelligence',
      'Conversion funnel + "Why no callback" insights',
    ],
  },
];

export default function SubscriptionPage() {
  const { user } = useAuth();
  const currentTier = user?.subscription_tier || 'free';

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Choose your plan</h1>
          <p className="text-sm text-slate-500 mt-2">Every plan includes AI resume tailoring. Upgrade for unlimited access.</p>
        </div>

        <WhyHelper className="mb-8 text-center">
          Free users get the full Karmio experience with volume limits.
          Upgrade when you are ready to go all-in on your job search. Cancel anytime.
        </WhyHelper>

        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = currentTier === plan.key;
            return (
              <div key={plan.name}
                className={`bg-white dark:bg-slate-900 rounded-2xl border-2 p-6 flex flex-col ${
                  plan.highlight ? 'border-karmio-500' : isCurrent ? 'border-emerald-400 dark:border-emerald-600' : 'border-slate-200 dark:border-slate-700'
                }`}>
                {plan.highlight && !isCurrent && (
                  <div className="text-center mb-2">
                    <span className="inline-block px-3 py-1 bg-karmio-50 dark:bg-karmio-900/30 text-karmio-600 dark:text-karmio-400 text-xs font-medium rounded-full">
                      Most popular
                    </span>
                  </div>
                )}
                {isCurrent && (
                  <div className="text-center mb-2">
                    <span className="inline-block px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium rounded-full">
                      Your current plan
                    </span>
                  </div>
                )}
                <p className="text-sm text-slate-500">{plan.name}</p>
                <div className="mt-1 mb-4">
                  <span className="text-3xl font-semibold text-slate-900 dark:text-white">{plan.price}</span>
                  <span className="text-sm text-slate-400 ml-1">{plan.period}</span>
                </div>

                <ul className="space-y-3 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#10B981" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                        <path d="M3 8l3 3 7-7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  {isCurrent ? (
                    <Button fullWidth variant="ghost" disabled>Current plan</Button>
                  ) : (
                    <Button fullWidth variant={plan.highlight ? 'primary' : 'secondary'}>
                      {plan.key === 'free' ? 'Downgrade to Free' : `Upgrade to ${plan.name}`}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          India pricing: Popular ₹149/mo, Pro ₹299/mo. Prices shown for yearly billing.
        </p>
      </div>
    </AppShell>
  );
}
