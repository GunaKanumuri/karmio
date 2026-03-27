'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { AppShell } from '@/components/layout/AppShell';
import { Badge, MatchRing } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import { useApplications, useUpdateApplication } from '@/hooks/useApplications';
import { useOutreachSuggestions } from '@/hooks/useNetwork';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronRight, CheckCircle2, Clock, Briefcase, PhoneCall,
  Code2, Brain, Trophy, XCircle, ArrowRight, Sparkles,
  MoreHorizontal, FileText, ExternalLink, Users,
  MessageSquare, GripVertical, AlertTriangle,
} from 'lucide-react';

// ─── Stage Configuration ─────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  {
    key: 'saved', label: 'Saved', icon: Briefcase,
    dot: 'bg-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/30',
    border: 'border-slate-200 dark:border-slate-700',
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    dropBg: 'bg-slate-100/50 dark:bg-slate-800/50',
  },
  {
    key: 'applied', label: 'Applied', icon: CheckCircle2,
    dot: 'bg-blue-400', bg: 'bg-blue-50/50 dark:bg-blue-900/10',
    border: 'border-blue-200 dark:border-blue-800',
    badge: 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
    dropBg: 'bg-blue-100/50 dark:bg-blue-900/20',
  },
  {
    key: 'hr_screen', label: 'HR Screen', icon: PhoneCall,
    dot: 'bg-purple-400', bg: 'bg-purple-50/50 dark:bg-purple-900/10',
    border: 'border-purple-200 dark:border-purple-800',
    badge: 'bg-purple-50 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300',
    dropBg: 'bg-purple-100/50 dark:bg-purple-900/20',
  },
  {
    key: 'technical', label: 'Technical', icon: Code2,
    dot: 'bg-indigo-400', bg: 'bg-indigo-50/50 dark:bg-indigo-900/10',
    border: 'border-indigo-200 dark:border-indigo-800',
    badge: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300',
    dropBg: 'bg-indigo-100/50 dark:bg-indigo-900/20',
  },
  {
    key: 'behavioral', label: 'Behavioral', icon: Brain,
    dot: 'bg-violet-400', bg: 'bg-violet-50/50 dark:bg-violet-900/10',
    border: 'border-violet-200 dark:border-violet-800',
    badge: 'bg-violet-50 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300',
    dropBg: 'bg-violet-100/50 dark:bg-violet-900/20',
  },
  {
    key: 'offer', label: 'Offer', icon: Trophy,
    dot: 'bg-emerald-400', bg: 'bg-emerald-50/50 dark:bg-emerald-900/10',
    border: 'border-emerald-200 dark:border-emerald-800',
    badge: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
    dropBg: 'bg-emerald-100/50 dark:bg-emerald-900/20',
  },
] as const;

type StageKey = typeof PIPELINE_STAGES[number]['key'];

const CONFIRM_PROMPTS: Partial<Record<StageKey, { question: string; confirm: string; cancel: string }>> = {
  hr_screen: { question: 'Did you get an HR screening invite?', confirm: 'Yes, got an invite', cancel: 'Not yet' },
  technical: { question: 'Passed the HR screen? Moving to technical round?', confirm: 'Yes, moving to Technical', cancel: 'Still in HR Screen' },
  behavioral: { question: 'Passed the technical round?', confirm: 'Yes, onto Behavioral', cancel: 'Still in Technical' },
  offer: { question: 'Did you receive an offer?', confirm: '🎉 Yes, I got an offer!', cancel: 'Still in Behavioral' },
};

function getStage(key: string) {
  return PIPELINE_STAGES.find(s => s.key === key) || PIPELINE_STAGES[0];
}

function getDaysInStage(app: any): number {
  const entered = app.stage_entered_at || app.applied_at || app.created_at;
  return Math.floor((Date.now() - new Date(entered).getTime()) / 86400000);
}

// ─── Pipeline Card (Draggable) ───────────────────────────────────────────────

function PipelineCard({ app, outreach, onReject, onViewJob }: {
  app: any;
  outreach: any;
  onReject: (id: string) => void;
  onViewJob: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const daysInStage = getDaysInStage(app);
  const isStale = daysInStage > 14;
  const hasOutreach = outreach && outreach.outreach_status !== 'pending';

  const logoUrl = `https://logo.clearbit.com/${(app.job?.company_name || '').toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-3 shadow-sm hover:shadow-md transition-all group ${
      isStale ? 'border-l-2 border-l-amber-400' : ''
    }`}>
      {/* Drag handle + header */}
      <div className="flex items-start gap-2 mb-2">
        <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-slate-300">
          <GripVertical size={12} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">
            {app.job?.title || 'Unknown Role'}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1">
            {app.job?.company_name}
            {app.job?.location && <span>· {app.job.location}</span>}
          </p>
        </div>

        {/* Match score mini ring */}
        {app.match_score > 0 && (
          <div className="flex-shrink-0">
            <MatchRing score={app.match_score} size={28} />
          </div>
        )}

        {/* Menu */}
        <div className="relative shrink-0">
          <button onClick={() => setMenuOpen(v => !v)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-slate-400 hover:text-slate-600">
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-5 z-20 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 text-xs">
              <button className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                onClick={() => { setMenuOpen(false); onViewJob(app.job?.id); }}>
                <ExternalLink size={11} className="inline mr-1.5" />View job
              </button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                onClick={() => { setMenuOpen(false); router.push(`/dashboard/resumes/builder?job=${app.job?.id}`); }}>
                <FileText size={11} className="inline mr-1.5" />Tailor resume
              </button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                onClick={() => { setMenuOpen(false); router.push('/dashboard/network/contacts'); }}>
                <Users size={11} className="inline mr-1.5" />Outreach
              </button>
              <hr className="my-1 border-slate-100 dark:border-slate-700" />
              <button className="w-full text-left px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                onClick={() => { setMenuOpen(false); onReject(app.id); }}>
                <XCircle size={11} className="inline mr-1.5" />Reject
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Days in stage */}
        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${
          isStale
            ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
        }`}>
          <Clock size={8} />
          {daysInStage}d
        </span>

        {/* Outreach status */}
        {hasOutreach && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <MessageSquare size={8} />
            {outreach.outreach_status === 'sent' ? 'Sent' :
             outreach.outreach_status === 'responded' ? 'Replied' :
             outreach.outreach_status === 'interview_scheduled' ? 'Interview' : 'Draft'}
          </span>
        )}

        {/* Stale warning */}
        {isStale && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <AlertTriangle size={8} />
            Stale
          </span>
        )}
      </div>

      {/* Offer celebration */}
      {app.status === 'offer' && (
        <div className="flex items-center justify-center gap-1 mt-2 py-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
          <Sparkles size={10} /> Offer received! 🎉
        </div>
      )}
    </div>
  );
}

// ─── Main Pipeline Page ──────────────────────────────────────────────────────

export default function PipelineBoardPage() {
  const { user } = useAuth();
  const { data: applications = [], isLoading } = useApplications();
  const { data: outreachList = [] } = useOutreachSuggestions();
  const updateApp = useUpdateApplication();
  const router = useRouter();

  const [confirmState, setConfirmState] = useState<{
    appId: string; appTitle: string; appCompany: string;
    fromStage: string; toStage: string;
  } | null>(null);
  const [showRejected, setShowRejected] = useState(false);

  // Build outreach lookup: application_id → outreach
  const outreachMap = useMemo(() => {
    const map: Record<string, any> = {};
    outreachList.forEach((o: any) => { map[o.application_id] = o; });
    return map;
  }, [outreachList]);

  // Visible apps (not rejected/no_response)
  const visibleApps = useMemo(() =>
    applications.filter((a: any) => a.status !== 'rejected' && a.status !== 'no_response'),
    [applications]
  );

  const rejectedApps = useMemo(() =>
    applications.filter((a: any) => a.status === 'rejected'),
    [applications]
  );

  // ─── Drag-and-drop handler ───
  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;

    const fromStage = result.source.droppableId;
    const toStage = result.destination.droppableId;

    if (fromStage === toStage) return; // same column, no change

    const appId = result.draggableId;
    const app = applications.find((a: any) => a.id === appId);
    if (!app) return;

    // Check if moving forward requires confirmation
    const fromIdx = PIPELINE_STAGES.findIndex(s => s.key === fromStage);
    const toIdx = PIPELINE_STAGES.findIndex(s => s.key === toStage);

    // Moving forward past 'applied' needs confirmation
    if (toIdx > fromIdx && toStage !== 'applied' && toStage !== 'saved' && CONFIRM_PROMPTS[toStage as StageKey]) {
      setConfirmState({
        appId,
        appTitle: app.job?.title || 'Unknown',
        appCompany: app.job?.company_name || '',
        fromStage,
        toStage,
      });
      return;
    }

    // No confirmation needed — update directly
    updateApp.mutate({ id: appId, status: toStage });
  }, [applications, updateApp]);

  const handleConfirm = () => {
    if (!confirmState) return;
    updateApp.mutate({ id: confirmState.appId, status: confirmState.toStage });
    setConfirmState(null);
  };

  const handleReject = (appId: string) => {
    updateApp.mutate({ id: appId, status: 'rejected' });
  };

  const handleViewJob = (jobId: string) => {
    if (jobId) router.push(`/dashboard/jobs/${jobId}`);
  };

  // ─── Stats ───
  const totalActive = visibleApps.length;
  const staleCount = visibleApps.filter((a: any) => getDaysInStage(a) > 14).length;

  return (
    <AppShell>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Pipeline board</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Drag cards between stages to update your progress.
              {staleCount > 0 && (
                <span className="text-amber-500 ml-1">
                  · {staleCount} stale (14+ days)
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {PIPELINE_STAGES.map((s, i) => (
              <span key={s.key} className="flex items-center gap-1 text-[10px] text-slate-400">
                <span className={`inline-block w-2 h-2 rounded-full ${s.dot}`} />
                <span className="hidden md:inline">{s.label}</span>
                {i < PIPELINE_STAGES.length - 1 && <ChevronRight size={8} className="text-slate-300 hidden md:block" />}
              </span>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 min-h-[200px]">
                <Skeleton lines={3} />
              </div>
            ))}
          </div>
        ) : totalActive > 0 ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pb-4">
              {PIPELINE_STAGES.map(stage => {
                const stageApps = visibleApps.filter((a: any) => a.status === stage.key);
                const StageIcon = stage.icon;

                return (
                  <Droppable droppableId={stage.key} key={stage.key}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-w-[160px] min-h-[200px] rounded-xl transition-colors p-2 ${
                          snapshot.isDraggingOver ? stage.dropBg : ''
                        }`}
                      >
                        {/* Column header */}
                        <div className={`flex items-center gap-2 mb-2.5 p-2 rounded-lg border ${stage.border} ${stage.bg}`}>
                          <div className={`w-2 h-2 rounded-full ${stage.dot} shrink-0`} />
                          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex-1 truncate">
                            {stage.label}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-full px-1.5 py-0.5 leading-none">
                            {stageApps.length}
                          </span>
                        </div>

                        {/* Draggable cards */}
                        {stageApps.map((app: any, index: number) => (
                          <Draggable key={app.id} draggableId={app.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`mb-2 transition-transform ${
                                  snapshot.isDragging ? 'rotate-2 scale-105 shadow-xl z-50' : ''
                                }`}
                              >
                                <PipelineCard
                                  app={app}
                                  outreach={outreachMap[app.id]}
                                  onReject={handleReject}
                                  onViewJob={handleViewJob}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}

                        {provided.placeholder}

                        {/* Empty state */}
                        {stageApps.length === 0 && !snapshot.isDraggingOver && (
                          <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-5 text-center">
                            <StageIcon size={14} className="mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                            <p className="text-[10px] text-slate-400">
                              {stage.key === 'saved' ? 'Save jobs to start' : 'Drop here'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </DragDropContext>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-12 text-center">
            <Briefcase size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Your pipeline is empty</p>
            <p className="text-xs text-slate-400 mb-4">Start applying to jobs to track your progress through each stage.</p>
            <Link href="/dashboard/jobs/feed">
              <Button variant="primary" size="sm">Browse jobs</Button>
            </Link>
          </div>
        )}

        {/* Rejected section */}
        {rejectedApps.length > 0 && (
          <div className="mt-4">
            <button onClick={() => setShowRejected(!showRejected)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center gap-1">
              <XCircle size={12} />
              {showRejected ? 'Hide' : 'Show'} {rejectedApps.length} rejected application{rejectedApps.length > 1 ? 's' : ''}
            </button>
            {showRejected && (
              <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {rejectedApps.map((app: any) => (
                  <div key={app.id} className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl p-3 opacity-60">
                    <p className="text-xs font-medium text-slate-500 truncate">{app.job?.title}</p>
                    <p className="text-[10px] text-slate-400 truncate">{app.job?.company_name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation modal */}
      {confirmState && (
        <Modal open={!!confirmState} onClose={() => setConfirmState(null)} title="Update stage" size="sm">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getStage(confirmState.fromStage).badge}`}>
                {(() => { const Icon = getStage(confirmState.fromStage).icon; return <Icon size={14} />; })()}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{confirmState.appTitle}</p>
                <p className="text-xs text-slate-500">{confirmState.appCompany}</p>
              </div>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">
              {CONFIRM_PROMPTS[confirmState.toStage as StageKey]?.question || `Move to ${confirmState.toStage}?`}
            </p>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className={`px-2 py-1 rounded-md font-medium ${getStage(confirmState.fromStage).badge}`}>
                {getStage(confirmState.fromStage).label}
              </span>
              <ArrowRight size={12} />
              <span className={`px-2 py-1 rounded-md font-medium ${getStage(confirmState.toStage).badge}`}>
                {getStage(confirmState.toStage).label}
              </span>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="secondary" size="sm" fullWidth onClick={() => setConfirmState(null)}>
                {CONFIRM_PROMPTS[confirmState.toStage as StageKey]?.cancel || 'Cancel'}
              </Button>
              <Button variant="primary" size="sm" fullWidth loading={updateApp.isPending} onClick={handleConfirm}>
                {CONFIRM_PROMPTS[confirmState.toStage as StageKey]?.confirm || 'Confirm'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}