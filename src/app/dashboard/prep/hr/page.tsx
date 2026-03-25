'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { WhyHelper, Skeleton, UpgradePrompt } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import { useApplications } from '@/hooks/useApplications';
import { fetchAPI } from '@/hooks/useJobs';
import { TIER_LIMITS } from '@/lib/constants';
import { BookOpen, ChevronDown, ChevronUp, Sparkles, Briefcase } from 'lucide-react';

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
  const { data: applications = [], isLoading } = useApplications();
  const tier = (user?.subscription_tier || 'free') as keyof typeof TIER_LIMITS;
  const limits = TIER_LIMITS[tier];

  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const [aiPrepApp, setAiPrepApp] = useState<any>(null);
  const [aiPrep, setAiPrep] = useState<any>(null);
  const [aiPrepLoading, setAiPrepLoading] = useState(false);
  const [aiPrepError, setAiPrepError] = useState<string | null>(null);

  // Filter to HR-screen and applied stage applications
  const hrApps = applications.filter((a: any) =>
    ['applied', 'hr_screen'].includes(a.status)
  );

  const handleGeneratePrep = async (app: any) => {
    if (!limits.has_interview_prep) return;
    setAiPrepApp(app);
    setAiPrepLoading(true);
    setAiPrepError(null);
    setAiPrep(null);
    try {
      const res = await fetchAPI<any>('/ai', {
        method: 'POST',
        body: JSON.stringify({
          type: 'interview-prep',
          job_id: app.job_id,
          company: app.job?.company_name || '',
          role: app.job?.title || '',
          stage: 'hr',
        }),
      });
      if ((res as any).success && (res as any).data) {
        setAiPrep((res as any).data);
      } else {
        setAiPrepError((res as any).error?.message || 'Could not generate prep.');
      }
    } catch {
      setAiPrepError('Network error — please try again.');
    }
    setAiPrepLoading(false);
  };

  return (
    <AppShell>
      <div className="max-w-3xl">
        <h1 className="text-lg font-medium text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <BookOpen size={20} className="text-slate-400" /> HR Round Prep
        </h1>
        <p className="text-xs text-slate-500 mb-4">
          Common HR screening questions and tips. Use AI prep for company-specific coaching.
        </p>

        {/* Active HR screens */}
        {!isLoading && hrApps.length > 0 && (
          <Card padding="lg" className="mb-4 border-karmio-200 dark:border-karmio-800/50">
            <div className="flex items-center gap-2 mb-3">
              <Briefcase size={16} className="text-karmio-500" />
              <p className="text-sm font-medium text-karmio-800 dark:text-karmio-200">Your upcoming HR screens</p>
            </div>
            <div className="space-y-2">
              {hrApps.slice(0, 5).map((app: any) => (
                <div key={app.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                  <div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {app.job?.company_name || 'Unknown'} — {app.job?.title || 'Unknown'}
                    </p>
                    <Badge variant="info" className="mt-0.5">{app.status.replace('_', ' ')}</Badge>
                  </div>
                  {limits.has_interview_prep ? (
                    <Button size="sm" variant="ghost" onClick={() => handleGeneratePrep(app)}>
                      <Sparkles size={12} /> AI Prep
                    </Button>
                  ) : (
                    <Badge variant="default">Pro</Badge>
                  )}
                </div>
              ))}
            </div>
            {!limits.has_interview_prep && (
              <div className="mt-3">
                <UpgradePrompt feature="AI interview prep" tierNeeded="Pro" />
              </div>
            )}
          </Card>
        )}

        <WhyHelper className="mb-6">
          These are the most commonly asked HR screening questions. Practice answering each one out loud.
          Tailor your answers to each specific company and role.
          {user?.country === 'US' && (
            <span className="block mt-2 font-medium">
              Tip for visa holders: Be prepared to address your work authorization status confidently and concisely.
            </span>
          )}
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

        {/* AI Prep Modal */}
        <Modal
          open={!!aiPrepApp}
          onClose={() => { setAiPrepApp(null); setAiPrep(null); setAiPrepError(null); }}
          title={`AI Prep: ${aiPrepApp?.job?.company_name || ''}`}
          size="lg"
        >
          {aiPrepLoading ? (
            <div className="py-8 text-center">
              <div className="w-8 h-8 border-2 border-karmio-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">Generating company-specific prep...</p>
            </div>
          ) : aiPrepError ? (
            <div className="py-6 text-center">
              <p className="text-sm text-red-500 mb-3">{aiPrepError}</p>
              <Button variant="secondary" size="sm" onClick={() => aiPrepApp && handleGeneratePrep(aiPrepApp)}>
                Try again
              </Button>
            </div>
          ) : aiPrep ? (
            <div className="space-y-4">
              {aiPrep.company_overview && (
                <div>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Company Overview</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{aiPrep.company_overview}</p>
                </div>
              )}
              {aiPrep.tailored_questions && aiPrep.tailored_questions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Tailored Questions</p>
                  <div className="space-y-2">
                    {aiPrep.tailored_questions.map((q: any, i: number) => (
                      <div key={i} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">{q.question}</p>
                        <p className="text-xs text-slate-500 leading-relaxed">{q.guidance}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {aiPrep.talking_points && aiPrep.talking_points.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Key Talking Points</p>
                  <div className="space-y-1">
                    {aiPrep.talking_points.map((point: string, i: number) => (
                      <p key={i} className="text-xs text-slate-600 dark:text-slate-400 flex gap-2">
                        <span className="text-karmio-500 flex-shrink-0">•</span> {point}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              {typeof aiPrep === 'string' && (
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{aiPrep}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-6">Click AI Prep on an application to generate company-specific coaching.</p>
          )}
        </Modal>
      </div>
    </AppShell>
  );
}