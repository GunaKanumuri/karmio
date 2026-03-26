'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import {
  ChevronRight,
  CheckCircle2,
  Clock,
  Briefcase,
  PhoneCall,
  Code2,
  Brain,
  Trophy,
  XCircle,
  ArrowRight,
  Sparkles,
  MoreHorizontal,
} from 'lucide-react';

// ─── Stage config ────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  {
    key: 'saved',
    label: 'Saved',
    next: 'applied',
    nextLabel: 'Mark as Applied',
    icon: Briefcase,
    dot: 'bg-slate-400',
    ring: 'ring-slate-200 dark:ring-slate-700',
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    prompt: null, // no dialog needed — just move
  },
  {
    key: 'applied',
    label: 'Applied',
    next: 'hr_screen',
    nextLabel: 'Got HR Screen invite?',
    icon: CheckCircle2,
    dot: 'bg-blue-400',
    ring: 'ring-blue-200 dark:ring-blue-800',
    badge: 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
    prompt: {
      question: 'Did you get an HR screening invite?',
      confirm: 'Yes, I got an invite',
      cancel: 'Not yet',
    },
  },
  {
    key: 'hr_screen',
    label: 'HR Screen',
    next: 'technical',
    nextLabel: 'Passed HR? → Technical',
    icon: PhoneCall,
    dot: 'bg-purple-400',
    ring: 'ring-purple-200 dark:ring-purple-800',
    badge: 'bg-purple-50 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300',
    prompt: {
      question: 'Did you pass the HR screen and get a technical round scheduled?',
      confirm: 'Yes, moving to Technical',
      cancel: 'Still in HR Screen',
    },
  },
  {
    key: 'technical',
    label: 'Technical',
    next: 'behavioral',
    nextLabel: 'Passed Technical? → Behavioral',
    icon: Code2,
    dot: 'bg-indigo-400',
    ring: 'ring-indigo-200 dark:ring-indigo-800',
    badge: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300',
    prompt: {
      question: 'Did you pass the technical round?',
      confirm: 'Yes, onto Behavioral',
      cancel: 'Still Technical',
    },
  },
  {
    key: 'behavioral',
    label: 'Behavioral',
    next: 'offer',
    nextLabel: 'Got an offer?',
    icon: Brain,
    dot: 'bg-violet-400',
    ring: 'ring-violet-200 dark:ring-violet-800',
    badge: 'bg-violet-50 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300',
    prompt: {
      question: 'Did you pass the behavioral round and receive an offer?',
      confirm: '🎉 Yes, I got an offer!',
      cancel: 'Still in Behavioral',
    },
  },
  {
    key: 'offer',
    label: 'Offer',
    next: null,
    nextLabel: null,
    icon: Trophy,
    dot: 'bg-emerald-400',
    ring: 'ring-emerald-200 dark:ring-emerald-800',
    badge: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
    prompt: null,
  },
] as const;

type StageKey = (typeof PIPELINE_STAGES)[number]['key'];

interface ConfirmState {
  appId: string;
  appTitle: string;
  appCompany: string;
  currentStage: StageKey;
  nextStage: StageKey;
  promptConfig: NonNullable<(typeof PIPELINE_STAGES)[number]['prompt']>;
}

// ─── Utils ───────────────────────────────────────────────────────────────────

function getStage(key: string) {
  return PIPELINE_STAGES.find(s => s.key === key) ?? PIPELINE_STAGES[0];
}

function getStageIndex(key: string) {
  return PIPELINE_STAGES.findIndex(s => s.key === key);
}

// ─── Card ────────────────────────────────────────────────────────────────────

interface ApplicationCardProps {
  app: any;
  onAdvance: (appId: string) => void;
  onReject: (appId: string) => void;
}

function ApplicationCard({ app, onAdvance, onReject }: ApplicationCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const stage = getStage(app.status);
  const StageIcon = stage.icon;
  const hasNext = !!stage.next;

  return (
    <div
      className={`
        group relative bg-white dark:bg-slate-900
        border border-slate-200 dark:border-slate-700/50
        rounded-xl p-3 shadow-sm hover:shadow-md
        transition-all duration-200 hover:-translate-y-0.5
      `}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">
            {app.job?.title || 'Unknown Role'}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {app.job?.company_name}
          </p>
        </div>

        {/* More menu */}
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-5 z-10 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 text-xs">
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                onClick={() => { setMenuOpen(false); onReject(app.id); }}
              >
                Mark Rejected
              </button>
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                onClick={() => setMenuOpen(false)}
              >
                Add Note
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Match score + stage badge */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
        {app.match_score && (
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium
              ${app.match_score >= 70
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}
          >
            {app.match_score}% match
          </span>
        )}
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${stage.badge}`}>
          <StageIcon size={9} />
          {stage.label}
        </span>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-1 mb-2.5">
        {PIPELINE_STAGES.map((s, i) => {
          const currentIdx = getStageIndex(app.status);
          const isPast = i < currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div
              key={s.key}
              className={`
                h-1 flex-1 rounded-full transition-all duration-300
                ${isPast ? s.dot : isCurrent ? `${s.dot} opacity-100` : 'bg-slate-100 dark:bg-slate-800'}
              `}
            />
          );
        })}
      </div>

      {/* Advance button */}
      {hasNext && (
        <button
          onClick={() => onAdvance(app.id)}
          className={`
            w-full flex items-center justify-center gap-1.5
            text-[10px] font-medium py-1.5 px-2 rounded-lg
            border border-dashed border-slate-200 dark:border-slate-700
            text-slate-500 dark:text-slate-400
            hover:border-karmio-400 hover:text-karmio-600 dark:hover:text-karmio-400
            hover:bg-karmio-50 dark:hover:bg-karmio-900/20
            transition-all duration-150 group/btn
          `}
        >
          <ArrowRight size={10} className="group-hover/btn:translate-x-0.5 transition-transform" />
          {stage.nextLabel}
        </button>
      )}

      {app.status === 'offer' && (
        <div className="flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
          <Sparkles size={10} />
          Offer received! 🎉
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PipelineBoardPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await fetch('/api/applications');
        const json = await res.json();
        if (json.success) setApplications(json.data || []);
      } catch {}
      setLoading(false);
    })();
  }, [user]);

  const updateStatus = useCallback(async (appId: string, newStatus: string) => {
    setAdvancing(true);
    try {
      await fetch('/api/applications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appId, status: newStatus }),
      });
      setApplications(prev =>
        prev.map(a => (a.id === appId ? { ...a, status: newStatus } : a))
      );
    } catch {}
    setAdvancing(false);
  }, []);

  // Called when user clicks "advance" on a card
  const handleAdvance = useCallback((appId: string) => {
    const app = applications.find(a => a.id === appId);
    if (!app) return;

    const currentStage = getStage(app.status);
    if (!currentStage.next) return;
    const nextStage = getStage(currentStage.next);

    // If no prompt needed (saved → applied), advance immediately
    if (!currentStage.prompt) {
      updateStatus(appId, currentStage.next);
      return;
    }

    setConfirmState({
      appId,
      appTitle: app.job?.title ?? 'Unknown Role',
      appCompany: app.job?.company_name ?? '',
      currentStage: currentStage.key as StageKey,
      nextStage: nextStage.key as StageKey,
      promptConfig: currentStage.prompt,
    });
  }, [applications, updateStatus]);

  const handleReject = useCallback(async (appId: string) => {
    await updateStatus(appId, 'rejected');
  }, [updateStatus]);

  const handleConfirm = async () => {
    if (!confirmState) return;
    await updateStatus(confirmState.appId, confirmState.nextStage);
    setConfirmState(null);
  };

  // Rejected apps are filtered out of the kanban
  const visibleApps = applications.filter(a => a.status !== 'rejected' && a.status !== 'no_response');

  return (
    <AppShell>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Pipeline board</h1>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-1">
              {PIPELINE_STAGES.map((s, i) => (
                <span key={s.key} className="flex items-center gap-1">
                  <span className={`inline-block w-2 h-2 rounded-full ${s.dot}`} />
                  <span className="hidden sm:inline">{s.label}</span>
                  {i < PIPELINE_STAGES.length - 1 && <ChevronRight size={10} className="text-slate-300 hidden sm:block" />}
                </span>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 min-h-[200px]">
                <Skeleton lines={3} />
              </div>
            ))}
          </div>
        ) : visibleApps.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto pb-2">
            {PIPELINE_STAGES.map(stage => {
              const stageApps = visibleApps.filter(a => a.status === stage.key);
              const StageIcon = stage.icon;

              return (
                <div key={stage.key} className="min-w-[170px]">
                  {/* Column header */}
                  <div className={`flex items-center gap-2 mb-2.5 p-2 rounded-lg ring-1 ${stage.ring} bg-white dark:bg-slate-900`}>
                    <div className={`w-2 h-2 rounded-full ${stage.dot} shrink-0`} />
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex-1 truncate">
                      {stage.label}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-full px-1.5 py-0.5 leading-none">
                      {stageApps.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2">
                    {stageApps.map(app => (
                      <ApplicationCard
                        key={app.id}
                        app={app}
                        onAdvance={handleAdvance}
                        onReject={handleReject}
                      />
                    ))}
                    {stageApps.length === 0 && (
                      <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-5 text-center">
                        <StageIcon size={14} className="mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                        <p className="text-[10px] text-slate-400">Empty</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-12 text-center">
            <p className="text-sm text-slate-500">Your pipeline is empty</p>
            <p className="text-xs text-slate-400 mt-1">Start applying to jobs to track your progress through each stage.</p>
            <Link href="/dashboard/jobs/feed" className="inline-block mt-3">
              <Button variant="primary" size="sm">Browse jobs</Button>
            </Link>
          </div>
        )}

        {/* Rejected section (collapsed count) */}
        {applications.filter(a => a.status === 'rejected').length > 0 && (
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
            <XCircle size={12} />
            {applications.filter(a => a.status === 'rejected').length} rejected application(s) hidden
          </div>
        )}
      </div>

      {/* ── Confirmation Dialog ── */}
      {confirmState && (
        <Modal
          open={!!confirmState}
          onClose={() => setConfirmState(null)}
          title="Update stage"
          size="sm"
        >
          <div className="space-y-4">
            {/* Job info */}
            <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getStage(confirmState.currentStage).badge}`}>
                {(() => { const Icon = getStage(confirmState.currentStage).icon; return <Icon size={14} />; })()}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{confirmState.appTitle}</p>
                <p className="text-xs text-slate-500">{confirmState.appCompany}</p>
              </div>
            </div>

            {/* Question */}
            <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">
              {confirmState.promptConfig.question}
            </p>

            {/* Stage transition preview */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className={`px-2 py-1 rounded-md font-medium ${getStage(confirmState.currentStage).badge}`}>
                {getStage(confirmState.currentStage).label}
              </span>
              <ArrowRight size={12} />
              <span className={`px-2 py-1 rounded-md font-medium ${getStage(confirmState.nextStage).badge}`}>
                {getStage(confirmState.nextStage).label}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => setConfirmState(null)}
              >
                {confirmState.promptConfig.cancel}
              </Button>
              <Button
                variant="primary"
                size="sm"
                fullWidth
                loading={advancing}
                onClick={handleConfirm}
              >
                {confirmState.promptConfig.confirm}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}