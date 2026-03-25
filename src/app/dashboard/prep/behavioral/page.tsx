'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { WhyHelper, UpgradePrompt } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import { ChevronDown, ChevronUp } from 'lucide-react';

const BEHAVIORAL_QUESTIONS = [
  { q: 'Tell me about a time you led a project from start to finish.', framework: 'STAR', tip: 'Emphasize planning, delegation, overcoming obstacles, and measurable outcomes.' },
  { q: 'Describe a situation where you had to learn something quickly.', framework: 'STAR', tip: 'Show intellectual curiosity. Mention specific resources and how fast you became productive.' },
  { q: 'Give an example of when you went above and beyond.', framework: 'STAR', tip: 'Pick something that genuinely exceeded expectations, not just doing your job well.' },
  { q: 'Tell me about a time you failed.', framework: 'STAR', tip: 'Be honest about the failure. Focus 70% of your answer on what you learned and changed.' },
  { q: 'How do you handle competing priorities?', framework: 'STAR', tip: 'Show a framework: urgency vs importance matrix, stakeholder communication, time-boxing.' },
  { q: 'Describe a time you influenced without authority.', framework: 'STAR', tip: 'Show empathy, data-driven persuasion, and building consensus across teams.' },
  { q: 'Tell me about receiving critical feedback.', framework: 'STAR', tip: 'Show you seek feedback proactively. Describe concrete changes you made as a result.' },
  { q: 'How do you approach ambiguous problems?', framework: 'STAR', tip: 'Show structured thinking: define constraints, identify stakeholders, break into sub-problems, iterate.' },
];

export default function BehavioralPrepPage() {
  const { user } = useAuth();
  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const tier = user?.subscription_tier || 'free';

  return (
    <AppShell>
      <div className="max-w-3xl">
        <h1 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Behavioral prep</h1>
        <p className="text-xs text-slate-500 mb-4">Common behavioral interview questions with the STAR framework.</p>

        <WhyHelper className="mb-6">
          Use the STAR method: Situation → Task → Action → Result. Prepare 2-3 stories that can cover multiple questions.
          Practice telling each story in under 2 minutes.
        </WhyHelper>

        <div className="space-y-2">
          {BEHAVIORAL_QUESTIONS.map((item, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedQ(expandedQ === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-[10px] font-medium text-purple-600 dark:text-purple-400 flex-shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{item.q}</p>
                </div>
                {expandedQ === i ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
              </button>
              {expandedQ === i && (
                <div className="px-4 pb-4 pt-0">
                  <div className="ml-9 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 space-y-2">
                    <p className="text-[10px] font-medium text-purple-600 dark:text-purple-400">Framework: {item.framework}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{item.tip}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {tier !== 'pro' && (
          <div className="mt-6">
            <UpgradePrompt feature="AI mock interviews with real-time feedback" tierNeeded="Pro" />
          </div>
        )}
      </div>
    </AppShell>
  );
}
