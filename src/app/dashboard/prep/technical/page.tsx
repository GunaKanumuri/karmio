'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { WhyHelper, UpgradePrompt } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import { ChevronDown, ChevronUp, Code } from 'lucide-react';

const TECH_TOPICS = [
  {
    category: 'Data structures',
    items: [
      { topic: 'Arrays and strings', tip: 'Know sliding window, two-pointer, and prefix sum patterns. Most common in interviews.' },
      { topic: 'Hash maps', tip: 'Used in ~40% of coding problems. Know when to use a map vs set. O(1) lookup is the key insight.' },
      { topic: 'Trees and graphs', tip: 'Master BFS/DFS, level-order traversal, and detecting cycles. Practice on binary trees first.' },
      { topic: 'Stacks and queues', tip: 'Common for parsing problems, monotonic stack patterns, and BFS implementations.' },
    ],
  },
  {
    category: 'System design',
    items: [
      { topic: 'Load balancing', tip: 'Understand round-robin, least connections, and consistent hashing. Know when to use each.' },
      { topic: 'Caching strategies', tip: 'Know cache-aside, write-through, write-behind. Discuss TTLs, eviction policies, and cache invalidation.' },
      { topic: 'Database scaling', tip: 'Explain vertical vs horizontal scaling, sharding strategies, read replicas, and partitioning.' },
      { topic: 'API design', tip: 'REST vs GraphQL trade-offs. Pagination, rate limiting, versioning, and error handling patterns.' },
    ],
  },
  {
    category: 'Behavioral (STAR format)',
    items: [
      { topic: 'Handling tight deadlines', tip: 'Situation → Task → Action → Result. Emphasize how you prioritized and communicated.' },
      { topic: 'Working with difficult teammates', tip: 'Focus on empathy, finding common ground, and reaching resolution. Never blame.' },
      { topic: 'Technical disagreements', tip: 'Show you can advocate for your position with data while staying open to other viewpoints.' },
    ],
  },
];

export default function TechnicalPrepPage() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState<string | null>(null);
  const tier = user?.subscription_tier || 'free';

  return (
    <AppShell>
      <div className="max-w-3xl">
        <h1 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Technical prep</h1>
        <p className="text-xs text-slate-500 mb-4">Core topics for software engineering technical interviews.</p>

        <WhyHelper className="mb-6">
          These cover the most common technical interview topics. Focus on areas that match the roles you are applying to.
        </WhyHelper>

        <div className="space-y-4">
          {TECH_TOPICS.map((cat) => (
            <div key={cat.category} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4">
              <p className="text-sm font-medium text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Code size={14} className="text-karmio-500" /> {cat.category}
              </p>
              <div className="space-y-1">
                {cat.items.map((item) => {
                  const key = `${cat.category}-${item.topic}`;
                  const isOpen = expanded === key;
                  return (
                    <div key={key}>
                      <button onClick={() => setExpanded(isOpen ? null : key)}
                        className="w-full flex items-center justify-between py-2 text-left">
                        <p className="text-sm text-slate-700 dark:text-slate-300">{item.topic}</p>
                        {isOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                      </button>
                      {isOpen && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 mb-2">
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{item.tip}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {tier !== 'pro' && (
          <div className="mt-6">
            <UpgradePrompt feature="AI-powered mock interviews with personalized feedback" tierNeeded="Pro" />
          </div>
        )}
      </div>
    </AppShell>
  );
}
