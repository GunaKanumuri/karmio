'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { WhyHelper, Skeleton } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

const HR_QUESTIONS = [
  { q: 'Tell me about yourself.', tip: 'Structure: Current role → key achievement → why this company. Keep it under 90 seconds.' },
  { q: 'Why are you interested in this role?', tip: 'Connect your skills to their specific needs. Reference something from the job description.' },
  { q: 'Why are you leaving your current role?', tip: 'Stay positive. Focus on growth opportunities, not complaints about current role.' },
  { q: 'What are your salary expectations?', tip: 'Research the range first. Give a range, not a number. Anchor high within reason.' },
  { q: 'Where do you see yourself in 5 years?', tip: 'Show ambition aligned with the company. Mention skills you want to develop.' },
  { q: 'What is your biggest weakness?', tip: 'Choose a real weakness you are actively improving. Show self-awareness + action.' },
  { q: 'Tell me about a time you handled conflict.', tip: 'Use STAR format. Focus on resolution and what you learned.' },
  { q: 'Do you have any questions for us?', tip: 'Always ask 2-3 thoughtful questions. Ask about team culture, growth, or current challenges.' },
];

export default function HrPrepPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await fetch('/api/applications');
        const json = await res.json();
        if (json.success) {
          setApplications((json.data || []).filter((a: any) => ['hr_screen', 'applied'].includes(a.status)));
        }
      } catch {}
      setLoading(false);
    })();
  }, [user]);

  return (
    <AppShell>
      <div className="max-w-3xl">
        <h1 className="text-lg font-medium text-slate-900 dark:text-white mb-2">HR round prep</h1>
        <p className="text-xs text-slate-500 mb-4">Common HR screening questions and tips for answering them well.</p>

        {/* Active HR screens */}
        {!loading && applications.length > 0 && (
          <div className="bg-karmio-50 dark:bg-karmio-900/20 border border-karmio-200 dark:border-karmio-800/50 rounded-xl p-4 mb-6">
            <p className="text-sm font-medium text-karmio-800 dark:text-karmio-200 mb-2">Your upcoming HR screens</p>
            <div className="space-y-1">
              {applications.slice(0, 5).map(app => (
                <p key={app.id} className="text-xs text-karmio-600 dark:text-karmio-300">
                  {app.job?.company_name} — {app.job?.title}
                  <Badge variant="info" className="ml-2">{app.status.replace('_', ' ')}</Badge>
                </p>
              ))}
            </div>
          </div>
        )}

        <WhyHelper className="mb-6">
          These are the most commonly asked HR screening questions. Practice answering each one out loud.
          Tailor your answers to each specific company and role.
        </WhyHelper>

        {/* Question cards */}
        <div className="space-y-2">
          {HR_QUESTIONS.map((item, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedQ(expandedQ === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-karmio-100 dark:bg-karmio-900 flex items-center justify-center text-[10px] font-medium text-karmio-600 dark:text-karmio-400 flex-shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{item.q}</p>
                </div>
                {expandedQ === i ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </button>
              {expandedQ === i && (
                <div className="px-4 pb-4 pt-0">
                  <div className="ml-9 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{item.tip}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
