'use client';

import { useState, useMemo, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge, MatchRing } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { WhyHelper, Skeleton, UpgradePrompt } from '@/components/shared/Helpers';
import { PrepTimeline } from '@/components/prep/PrepTimeline';
import { PracticeCard, ConfidenceLevel } from '@/components/prep/PracticeCard';
import { MockInterview } from '@/components/prep/MockInterview';
import { PrepProgress } from '@/components/prep/PrepProgress';
import { useAuth } from '@/hooks/useAuth';
import { useApplications } from '@/hooks/useApplications';
import { usePrepState } from '@/hooks/usePrepState';
import { TIER_LIMITS } from '@/lib/constants';
import { getPersonalizedQuestions, type PrepStage } from '@/lib/ai/interview-prep';
import {
  BookOpen, Sparkles, PhoneCall, Code2, Brain, Trophy,
  Filter, ChevronDown, Target, Zap,
} from 'lucide-react';

// ─── Stage tab config ────────────────────────────────────────────────────────

const PREP_TABS: { key: PrepStage; label: string; icon: any; color: string; pipelineStages: string[] }[] = [
  { key: 'hr', label: 'HR Screen', icon: PhoneCall, color: 'purple', pipelineStages: ['applied', 'hr_screen'] },
  { key: 'behavioral', label: 'Behavioral', icon: Brain, color: 'violet', pipelineStages: ['behavioral'] },
  { key: 'technical', label: 'Technical', icon: Code2, color: 'indigo', pipelineStages: ['technical'] },
  { key: 'offer', label: 'Offers', icon: Trophy, color: 'emerald', pipelineStages: ['offer'] },
];

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PrepDashboardPage() {
  const { user } = useAuth();
  const { data: applications = [], isLoading } = useApplications();
  const tier = (user?.subscription_tier || 'free') as keyof typeof TIER_LIMITS;
  const limits = TIER_LIMITS[tier];

  const [activeTab, setActiveTab] = useState<PrepStage>('hr');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [mockApp, setMockApp] = useState<any>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const { prepState, updateAnswer, updateConfidence, isLoading: prepLoading } = usePrepState(user?.id);

  // ─── Derived data ──────────────────────────────────────────────────────────

  const interviewApps = useMemo(() =>
    applications.filter((a: any) =>
      ['applied', 'hr_screen', 'technical', 'behavioral', 'final', 'offer'].includes(a.status)
    ).sort((a: any, b: any) => {
      const order: Record<string, number> = {
        hr_screen: 0, technical: 1, behavioral: 2, final: 3, applied: 4, offer: 5,
      };
      return (order[a.status] ?? 99) - (order[b.status] ?? 99);
    }),
    [applications]
  );

  const selectedApp = useMemo(() =>
    selectedAppId ? interviewApps.find((a: any) => a.id === selectedAppId) : null,
    [selectedAppId, interviewApps]
  );

  // Personalized questions for active tab
  const questions = useMemo(() => {
    const parsedJD = selectedApp?.job?.description_parsed || null;
    const userSkills = user?.target_profiles?.[0]?.priority_skills || [];
    const visaStatus = user?.visa_status;
    return getPersonalizedQuestions(activeTab, {
      parsedJD,
      userSkills,
      experienceYears: 2,
      visaStatus,
      companyName: selectedApp?.job?.company_name || null,
      jobTitle: selectedApp?.job?.title || null,
    });
  }, [activeTab, selectedApp, user]);

  // Readiness score
  const readinessScore = useMemo(() => {
    if (!prepState || questions.length === 0) return 0;
    const key = selectedAppId || 'generic';
    let score = 0;
    questions.forEach((q) => {
      const s = prepState[`${key}:${activeTab}:${q.id}`];
      if (s?.confidence === 'confident') score += 1;
      else if (s?.confidence === 'practiced') score += 0.5;
    });
    return Math.round((score / questions.length) * 100);
  }, [prepState, questions, selectedAppId, activeTab]);

  // Deep link support: /dashboard/prep?stage=technical&app=uuid
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const stage = params.get('stage') as PrepStage | null;
    const appId = params.get('app');
    if (stage && PREP_TABS.some(t => t.key === stage)) setActiveTab(stage);
    if (appId) setSelectedAppId(appId);
  }, []);

  return (
    <AppShell>
      <div className="max-w-4xl">
        {/* ─── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen size={20} className="text-karmio-500" />
              Interview prep
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {selectedApp
                ? `Preparing for ${selectedApp.job?.company_name} — ${selectedApp.job?.title}`
                : 'General preparation — select a company above for tailored questions'}
            </p>
          </div>
          <PrepProgress score={readinessScore} stage={activeTab} />
        </div>

        {/* ─── Interview Timeline (shows pipeline link) ───────────────────── */}
        {!isLoading && interviewApps.length > 0 && (
          <PrepTimeline
            applications={interviewApps}
            selectedAppId={selectedAppId}
            onSelectApp={(id: string) => {
              setSelectedAppId(id === selectedAppId ? null : id);
              const app = interviewApps.find((a: any) => a.id === id);
              if (app) {
                const tab = PREP_TABS.find(t => t.pipelineStages.includes(app.status));
                if (tab) setActiveTab(tab.key);
              }
            }}
            onStartMock={(app: any) => {
              if (!limits.has_interview_prep) return;
              setMockApp(app);
            }}
            hasMockAccess={limits.has_interview_prep}
          />
        )}

        {/* ─── Tab bar + company filter ───────────────────────────────────── */}
        <div className="flex items-center gap-2 mt-5 mb-4 border-b border-slate-200 dark:border-slate-700/50 pb-3">
          <div className="flex gap-1 flex-1 overflow-x-auto">
            {PREP_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              const count = interviewApps.filter((a: any) =>
                tab.pipelineStages.includes(a.status)
              ).length;

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-karmio-50 dark:bg-karmio-900/30 text-karmio-600 dark:text-karmio-400'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <Icon size={13} />
                  {tab.label}
                  {count > 0 && (
                    <span className={`ml-0.5 text-[9px] px-1.5 py-0.5 rounded-full leading-none ${
                      isActive
                        ? 'bg-karmio-100 dark:bg-karmio-800/40 text-karmio-600 dark:text-karmio-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Company filter */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                selectedAppId
                  ? 'border-karmio-200 dark:border-karmio-800 bg-karmio-50 dark:bg-karmio-900/20 text-karmio-600 dark:text-karmio-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Filter size={12} />
              <span className="hidden sm:inline">{selectedApp ? selectedApp.job?.company_name : 'All companies'}</span>
              <ChevronDown size={12} />
            </button>
            {filterOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setFilterOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-30 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => { setSelectedAppId(null); setFilterOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                      !selectedAppId ? 'text-karmio-600 dark:text-karmio-400 font-medium bg-karmio-50/50 dark:bg-karmio-900/10' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Target size={11} className="inline mr-2 opacity-60" />
                    General prep (all companies)
                  </button>
                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-0.5" />
                  {interviewApps.map((app: any) => (
                    <button
                      key={app.id}
                      onClick={() => { setSelectedAppId(app.id); setFilterOpen(false); }}
                      className={`w-full text-left px-3 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between gap-2 ${
                        selectedAppId === app.id ? 'text-karmio-600 dark:text-karmio-400 font-medium bg-karmio-50/50 dark:bg-karmio-900/10' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span className="truncate min-w-0">
                        {app.job?.company_name} — {app.job?.title}
                      </span>
                      <Badge variant={
                        app.status === 'offer' ? 'success'
                        : app.status === 'hr_screen' ? 'purple'
                        : app.status === 'technical' ? 'info'
                        : 'default'
                      }>
                        {app.status.replace('_', ' ')}
                      </Badge>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ─── Context tip ────────────────────────────────────────────────── */}
        <WhyHelper className="mb-5">
          {activeTab === 'hr' && (
            <>
              HR screens evaluate culture fit, motivation, and communication.
              {selectedApp
                ? ` Questions below are tailored for ${selectedApp.job?.company_name}.`
                : ' Select a company above for tailored questions.'}
              {user?.visa_status && (
                <span className="block mt-1.5 font-medium">
                  Visa-specific questions are included below. Practice your work authorization narrative.
                </span>
              )}
            </>
          )}
          {activeTab === 'behavioral' && (
            <>
              Use the STAR method: Situation → Task → Action → Result. Prepare 2-3 versatile stories.
              {selectedApp ? ` Mapped to ${selectedApp.job?.company_name}'s core responsibilities.` : ''}
            </>
          )}
          {activeTab === 'technical' && (
            selectedApp?.job?.description_parsed?.required_skills?.length
              ? `Focus areas: ${selectedApp.job.description_parsed.required_skills.slice(0, 5).join(', ')}. Questions match this JD.`
              : 'Cover data structures, system design, and role-specific technologies. Select a company for JD-matched questions.'
          )}
          {activeTab === 'offer' && (
            'Negotiation can increase total compensation by 10-20%. Never accept the first offer.'
          )}
        </WhyHelper>

        {/* ─── Question cards with practice mode ──────────────────────────── */}
        <div className="space-y-2">
          {questions.map((q, i) => (
            <PracticeCard
              key={q.id}
              index={i}
              question={q}
              stage={activeTab}
              savedAnswer={prepState?.[`${selectedAppId || 'generic'}:${activeTab}:${q.id}`]?.answer || ''}
              confidence={prepState?.[`${selectedAppId || 'generic'}:${activeTab}:${q.id}`]?.confidence || 'not_started'}
              onSaveAnswer={(answer: string) => updateAnswer(`${selectedAppId || 'generic'}:${activeTab}:${q.id}`, answer)}
              onUpdateConfidence={(level: ConfidenceLevel) => updateConfidence(`${selectedAppId || 'generic'}:${activeTab}:${q.id}`, level)}
            />
          ))}
        </div>

        {/* ─── AI Mock Interview CTA ──────────────────────────────────────── */}
        {selectedApp && (
          <div className="mt-6">
            {limits.has_interview_prep ? (
              <Card padding="lg" className="border-karmio-200 dark:border-karmio-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-karmio-50 dark:bg-karmio-900/30 flex items-center justify-center">
                      <Sparkles size={16} className="text-karmio-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        AI mock interview
                      </p>
                      <p className="text-xs text-slate-500">
                        Practice with AI as {activeTab === 'hr' ? 'an HR recruiter' : activeTab === 'technical' ? 'a technical interviewer' : 'an interviewer'} from {selectedApp.job?.company_name}
                      </p>
                    </div>
                  </div>
                  <Button variant="primary" size="sm" onClick={() => setMockApp(selectedApp)}>
                    <Zap size={12} /> Start mock
                  </Button>
                </div>
              </Card>
            ) : (
              <UpgradePrompt feature="AI mock interviews with real-time feedback" tierNeeded="Pro" />
            )}
          </div>
        )}

        {/* ─── Mock Interview Panel ───────────────────────────────────────── */}
        {mockApp && (
          <MockInterview
            application={mockApp}
            stage={activeTab}
            onClose={() => setMockApp(null)}
          />
        )}
      </div>
    </AppShell>
  );
}