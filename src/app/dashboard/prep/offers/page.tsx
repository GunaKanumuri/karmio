'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { WhyHelper, UpgradePrompt } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import { ChevronDown, ChevronUp, DollarSign } from 'lucide-react';

const NEGOTIATION_TIPS = [
  { title: 'Never accept the first offer', tip: 'Companies almost always have room to negotiate. A polite counter is expected and professional.' },
  { title: 'Know your market value', tip: 'Use levels.fyi, Glassdoor, and Blind to research compensation for your role, level, and location.' },
  { title: 'Negotiate the total package', tip: 'Base salary, equity/RSU, signing bonus, annual bonus, PTO, remote flexibility, and learning budget are all negotiable.' },
  { title: 'Use competing offers', tip: 'Having multiple offers is your strongest leverage. Be transparent about timelines without sharing exact numbers.' },
  { title: 'Ask for time', tip: 'Request at least 1 week to review the offer. This is standard and gives you time to negotiate properly.' },
  { title: 'Get everything in writing', tip: 'Verbal promises mean nothing. Ask for the complete offer letter before accepting.' },
  { title: 'Consider the trajectory', tip: 'A lower base at a faster-growing company may lead to better comp in 2-3 years. Think long term.' },
];

export default function OffersPrepPage() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const tier = user?.subscription_tier || 'free';

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await fetch('/api/applications');
        const json = await res.json();
        if (json.success) {
          setOffers((json.data || []).filter((a: any) => a.status === 'offer'));
        }
      } catch {}
      setLoading(false);
    })();
  }, [user]);

  return (
    <AppShell>
      <div className="max-w-3xl">
        <h1 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Offers and negotiation</h1>
        <p className="text-xs text-slate-500 mb-4">Tips for evaluating and negotiating job offers.</p>

        {/* Active offers */}
        {!loading && offers.length > 0 && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4 mb-6">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-2 flex items-center gap-2">
              <DollarSign size={16} /> You have {offers.length} active offer{offers.length > 1 ? 's' : ''}
            </p>
            {offers.map(o => (
              <p key={o.id} className="text-xs text-emerald-600 dark:text-emerald-300">
                {o.job?.company_name} — {o.job?.title}
              </p>
            ))}
          </div>
        )}

        <WhyHelper className="mb-6">
          Negotiation can increase your total compensation by 10-20%. These tips apply to both US and India markets.
        </WhyHelper>

        <div className="space-y-2">
          {NEGOTIATION_TIPS.map((item, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden">
              <button onClick={() => setExpanded(expanded === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{item.title}</p>
                </div>
                {expanded === i ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </button>
              {expanded === i && (
                <div className="px-4 pb-4 pt-0">
                  <div className="ml-9 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{item.tip}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {tier !== 'pro' && (
          <div className="mt-6">
            <UpgradePrompt feature="Salary intelligence with company-specific comp data" tierNeeded="Pro" />
          </div>
        )}
      </div>
    </AppShell>
  );
}
