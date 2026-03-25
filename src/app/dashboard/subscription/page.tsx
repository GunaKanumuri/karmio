'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { WhyHelper } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { fetchAPI } from '@/hooks/useJobs';
import { PRICING } from '@/lib/constants';
import { Zap, Check, AlertTriangle } from 'lucide-react';

const PLAN_FEATURES: Record<string, string[]> = {
  free: ['All core features (AI resume, cover letter, networking)', '5 applications per week', '1 target profile', 'Word export only', 'Basic analytics'],
  popular: ['Unlimited applications', '2 target profiles', 'Word + PDF + LaTeX export', 'Google Calendar sync', 'Full analytics with weekly graphs', 'All resume versions', 'Daily briefing + Power hour mode', 'Full email notifications'],
  pro: ['Everything in Popular', 'Unlimited target profiles', 'AI interview prep + mock interviews', 'Priority job alerts (within minutes)', 'Warm path finder', 'Salary intelligence', 'Conversion funnel + "Why no callback" insights'],
};

export default function SubscriptionPage() {
  const { user, refreshUser } = useAuth();
  const { data: subscription } = useSubscription();
  const currentTier = user?.subscription_tier || 'free';
  const country = (user?.country || 'US') as 'US' | 'IN';
  const pricing = PRICING[country];

  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  const handleUpgrade = async (plan: 'popular' | 'pro') => {
    setUpgrading(plan);
    try {
      const res = await fetchAPI<{ url: string }>('/payments', { method: 'POST', body: JSON.stringify({ action: 'checkout', plan, billing }) });
      if ((res as any).success && (res as any).data?.url) window.location.href = (res as any).data.url;
      else showToast((res as any).error?.message || 'Could not start checkout');
    } catch { showToast('Network error — please try again'); }
    setUpgrading(null);
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetchAPI<any>('/subscription/cancel', { method: 'POST' });
      if ((res as any).success) { showToast((res as any).data?.message || 'Subscription cancelled'); refreshUser(); setShowCancelModal(false); }
      else showToast((res as any).error?.message || 'Could not cancel subscription');
    } catch { showToast('Network error — please try again'); }
    setCancelling(false);
  };

  const getPrice = (plan: 'popular' | 'pro') => {
    const p = pricing[plan];
    if (billing === 'yearly') return { price: `${p.symbol}${p.yearly_monthly}`, period: '/mo billed yearly', total: `${p.symbol}${p.yearly_total}/yr` };
    return { price: `${p.symbol}${p.monthly}`, period: '/month', total: null };
  };

  const plans = [
    { key: 'free' as const, name: 'Free', priceDisplay: { price: '$0', period: 'forever', total: null } },
    { key: 'popular' as const, name: 'Popular', priceDisplay: getPrice('popular'), highlight: true },
    { key: 'pro' as const, name: 'Pro', priceDisplay: getPrice('pro') },
  ];

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Choose your plan</h1>
          <p className="text-sm text-slate-500 mt-2">Every plan includes AI resume tailoring. Upgrade for unlimited access.</p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button onClick={() => setBilling('monthly')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${billing === 'monthly' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Monthly</button>
            <button onClick={() => setBilling('yearly')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${billing === 'yearly' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Yearly <Badge variant="success">Save 25%</Badge></button>
          </div>
        </div>

        <WhyHelper className="mb-8 text-center">
          Free users get the full Karmio experience with volume limits. Upgrade when you&apos;re ready to go all-in on your job search. Cancel anytime.
        </WhyHelper>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {plans.map((plan) => {
            const isCurrent = currentTier === plan.key;
            const isUpgrade = (plan.key === 'popular' && currentTier === 'free') || (plan.key === 'pro' && currentTier !== 'pro');

            return (
              <div key={plan.key} className={`bg-white dark:bg-slate-900 rounded-2xl border-2 p-6 flex flex-col ${plan.highlight && !isCurrent ? 'border-karmio-500 shadow-lg shadow-karmio-500/10' : isCurrent ? 'border-emerald-400 dark:border-emerald-600' : 'border-slate-200 dark:border-slate-700'}`}>
                {plan.highlight && !isCurrent && <div className="text-center mb-2"><span className="inline-block px-3 py-1 bg-karmio-50 dark:bg-karmio-900/30 text-karmio-600 dark:text-karmio-400 text-xs font-medium rounded-full">Most popular</span></div>}
                {isCurrent && <div className="text-center mb-2"><span className="inline-block px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium rounded-full">Your current plan</span></div>}
                <p className="text-sm text-slate-500">{plan.name}</p>
                <div className="mt-1 mb-1">
                  <span className="text-3xl font-semibold text-slate-900 dark:text-white">{plan.priceDisplay.price}</span>
                  <span className="text-sm text-slate-400 ml-1">{plan.priceDisplay.period}</span>
                </div>
                {plan.priceDisplay.total ? <p className="text-xs text-slate-400 mb-3">{plan.priceDisplay.total}</p> : <div className="mb-3" />}
                <ul className="space-y-2.5 flex-1">
                  {PLAN_FEATURES[plan.key].map((feature, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300"><Check size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />{feature}</li>
                  ))}
                </ul>
                <div className="mt-6">
                  {isCurrent ? (
                    <div className="space-y-2">
                      <Button fullWidth variant="ghost" disabled>Current plan</Button>
                      {currentTier !== 'free' && <button onClick={() => setShowCancelModal(true)} className="w-full text-xs text-slate-400 hover:text-red-500 transition-colors py-1">Cancel subscription</button>}
                    </div>
                  ) : isUpgrade ? (
                    <Button fullWidth variant={plan.highlight ? 'primary' : 'secondary'} onClick={() => handleUpgrade(plan.key as 'popular' | 'pro')} loading={upgrading === plan.key}>
                      <Zap size={14} /> Upgrade to {plan.name}
                    </Button>
                  ) : <Button fullWidth variant="ghost" disabled>{plan.key === 'free' ? 'Cancel to downgrade' : 'Contact support'}</Button>}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-slate-400">
          {country === 'IN' ? 'Prices shown in INR. Billed via Stripe India or Razorpay.' : 'India pricing: Popular ₹149/mo, Pro ₹299/mo. Prices shown for yearly billing.'}
        </p>

        <Modal open={showCancelModal} onClose={() => setShowCancelModal(false)} title="Cancel subscription" size="sm">
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex gap-3">
              <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1">Are you sure?</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">Your subscription will remain active until the end of your current billing period. After that, you&apos;ll be downgraded to the Free plan.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCancelModal(false)}>Keep my plan</Button>
              <Button variant="danger" onClick={handleCancel} loading={cancelling}>Cancel subscription</Button>
            </div>
          </div>
        </Modal>

        {toast && <div className="fixed bottom-6 right-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg z-50 animate-fade-in">{toast}</div>}
      </div>
    </AppShell>
  );
}