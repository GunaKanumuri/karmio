'use client';

import { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { Skeleton } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import { useOutreachSuggestions, useUpdateOutreach, useAddContact } from '@/hooks/useNetwork';
import { useApplications } from '@/hooks/useApplications';
import {
  Users, Search, ArrowRight, ExternalLink, Mail, Linkedin,
  Copy, Check, ChevronDown, ChevronUp, Sparkles, Send,
  MessageSquare, Clock, CheckCircle2, Plus, Briefcase,
  UserPlus, Target, Eye,
} from 'lucide-react';

// ─── Outreach Status Config ───
const OUTREACH_STAGES = [
  { key: 'pending', label: 'Applied', color: 'bg-slate-400', badge: 'default' as const },
  { key: 'message_drafted', label: 'Connect', color: 'bg-blue-400', badge: 'info' as const },
  { key: 'sent', label: 'Sent', color: 'bg-purple-400', badge: 'purple' as const },
  { key: 'followed_up', label: 'Follow-up', color: 'bg-amber-400', badge: 'warning' as const },
  { key: 'responded', label: 'Responded', color: 'bg-emerald-400', badge: 'success' as const },
  { key: 'interview_scheduled', label: 'Interview', color: 'bg-green-500', badge: 'success' as const },
];

function getStageIndex(status: string) {
  return OUTREACH_STAGES.findIndex(s => s.key === status);
}

export default function NetworkPage() {
  const { user } = useAuth();
  const { data: outreach = [], isLoading } = useOutreachSuggestions();
  const { data: applications = [] } = useApplications();
  const updateOutreach = useUpdateOutreach();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleAdvance = async (id: string, nextStatus: string) => {
    await updateOutreach.mutateAsync({ id, outreach_status: nextStatus });
  };

  // Filter
  const filtered = useMemo(() => {
    return outreach.filter((o: any) => {
      if (search) {
        const q = search.toLowerCase();
        if (!o.company_name?.toLowerCase().includes(q)) return false;
      }
      if (statusFilter !== 'all' && o.outreach_status !== statusFilter) return false;
      return true;
    });
  }, [outreach, search, statusFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: outreach.length,
    pending: outreach.filter((o: any) => o.outreach_status === 'pending' || o.outreach_status === 'message_drafted').length,
    sent: outreach.filter((o: any) => o.outreach_status === 'sent').length,
    responded: outreach.filter((o: any) => o.outreach_status === 'responded' || o.outreach_status === 'interview_scheduled').length,
  }), [outreach]);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Users size={20} className="text-slate-400" /> Networking
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Smart outreach for every application. Connect with the right people to boost your chances.
          </p>
        </div>

        {/* Stats */}
        {stats.total > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-3 text-center">
              <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">{stats.pending}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Ready to send</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl px-4 py-3 text-center">
              <p className="text-lg font-semibold text-purple-700 dark:text-purple-300">{stats.sent}</p>
              <p className="text-xs text-purple-600 dark:text-purple-400">Messages sent</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-4 py-3 text-center">
              <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">{stats.responded}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Responses</p>
            </div>
          </div>
        )}

        {/* Pipeline status bar */}
        {stats.total > 0 && (
          <div className="flex items-center gap-1 mb-4 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            {OUTREACH_STAGES.map((stage, i) => {
              const count = outreach.filter((o: any) => o.outreach_status === stage.key).length;
              return (
                <button
                  key={stage.key}
                  onClick={() => setStatusFilter(statusFilter === stage.key ? 'all' : stage.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    statusFilter === stage.key
                      ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${stage.color}`} />
                  {stage.label}
                  {count > 0 && (
                    <span className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-full text-[10px]">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Search */}
        {stats.total > 0 && (
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search by company..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700
                bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white
                placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-karmio-500/30" />
          </div>
        )}

        {/* Outreach Cards */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Card key={i}><Skeleton lines={4} /></Card>)}
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((item: any) => (
              <OutreachCard
                key={item.id}
                item={item}
                isExpanded={expandedId === item.id}
                onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                onAdvance={handleAdvance}
                onCopy={handleCopy}
                copiedField={copiedField}
              />
            ))}
          </div>
        ) : stats.total > 0 ? (
          <Card>
            <div className="text-center py-8">
              <Search size={24} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm text-slate-500">No results match your filter.</p>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="text-center py-12">
              <UserPlus size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                No outreach suggestions yet
              </p>
              <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
                When you apply to jobs, Karmio automatically generates outreach targets and
                draft messages to help you connect with the right people.
              </p>
              <a href="/dashboard/jobs/feed">
                <Button variant="primary" size="sm">
                  <Briefcase size={14} className="mr-1" /> Browse & apply to jobs
                </Button>
              </a>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

// ─── Outreach Card ───
function OutreachCard({ item, isExpanded, onToggle, onAdvance, onCopy, copiedField }: {
  item: any;
  isExpanded: boolean;
  onToggle: () => void;
  onAdvance: (id: string, status: string) => void;
  onCopy: (text: string, field: string) => void;
  copiedField: string | null;
}) {
  const stage = OUTREACH_STAGES.find(s => s.key === item.outreach_status) || OUTREACH_STAGES[0];
  const stageIdx = getStageIndex(item.outreach_status);
  const nextStage = stageIdx < OUTREACH_STAGES.length - 1 ? OUTREACH_STAGES[stageIdx + 1] : null;
  const jobTitle = item.applications?.job_postings?.title || 'Unknown Role';
  const jobLocation = item.applications?.job_postings?.location || '';
  const suggestedRoles = item.suggested_roles || [];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-600">
      {/* Header — always visible */}
      <button onClick={onToggle} className="w-full text-left p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* Company initial */}
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-semibold text-slate-500 flex-shrink-0">
              {item.company_name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.company_name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{jobTitle} · {jobLocation}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant={stage.badge}>{stage.label}</Badge>
            {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1 mt-3">
          {OUTREACH_STAGES.map((s, i) => (
            <div key={s.key} className={`h-1 flex-1 rounded-full transition-all ${
              i <= stageIdx ? s.color : 'bg-slate-100 dark:bg-slate-800'
            }`} />
          ))}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4 animate-fade-in">

          {/* Search guidance */}
          {item.search_guidance && (
            <div className="bg-karmio-50 dark:bg-karmio-900/20 rounded-lg p-4 border border-karmio-200 dark:border-karmio-800">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-karmio-500" />
                <span className="text-xs font-semibold text-karmio-700 dark:text-karmio-300">Outreach Guide</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                {item.search_guidance}
              </p>
              {item.linkedin_search_url && (
                <a href={item.linkedin_search_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg bg-[#0A66C2] text-white text-xs font-medium hover:bg-[#004182] transition-colors">
                  <Linkedin size={12} /> Search on LinkedIn
                </a>
              )}
            </div>
          )}

          {/* Suggested roles to connect with */}
          {suggestedRoles.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Target size={12} /> People to connect with
              </p>
              <div className="space-y-2">
                {suggestedRoles.map((role: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <Users size={12} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{role.role}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{role.why}</p>
                      <p className="text-[10px] text-karmio-500 mt-1">{role.searchTip}</p>
                      {role.linkedin_url && (
                        <a href={role.linkedin_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1 text-[10px] text-blue-600 hover:underline">
                          <Linkedin size={10} /> View Profile
                        </a>
                      )}
                      {role.email && (
                        <a href={`mailto:${role.email}`}
                          className="inline-flex items-center gap-1 mt-1 ml-2 text-[10px] text-blue-600 hover:underline">
                          <Mail size={10} /> {role.email}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HR Draft Message */}
          {item.hr_draft && (
            <DraftMessage
              title="HR / Recruiter Message"
              icon={<MessageSquare size={12} />}
              draft={item.hr_draft}
              field={`hr-${item.id}`}
              onCopy={onCopy}
              copiedField={copiedField}
            />
          )}

          {/* Technical Draft Message */}
          {item.technical_draft && (
            <DraftMessage
              title="Technical / Engineer Message"
              icon={<Sparkles size={12} />}
              draft={item.technical_draft}
              field={`tech-${item.id}`}
              onCopy={onCopy}
              copiedField={copiedField}
            />
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            {nextStage && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onAdvance(item.id, nextStage.key)}
              >
                <ArrowRight size={12} className="mr-1" />
                Mark as {nextStage.label}
              </Button>
            )}
            {item.company_linkedin_url && (
              <a href={item.company_linkedin_url} target="_blank" rel="noopener noreferrer">
                <Button size="sm">
                  <Linkedin size={12} className="mr-1" /> Company Page
                </Button>
              </a>
            )}
            {item.applications?.job_postings?.source_url && (
              <a href={item.applications.job_postings.source_url} target="_blank" rel="noopener noreferrer">
                <Button size="sm">
                  <ExternalLink size={12} className="mr-1" /> Job Posting
                </Button>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Draft Message Component ───
function DraftMessage({ title, icon, draft, field, onCopy, copiedField }: {
  title: string; icon: React.ReactNode; draft: string;
  field: string; onCopy: (text: string, field: string) => void; copiedField: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isCopied = copiedField === field;

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <button onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
          {icon} {title}
        </span>
        {isOpen ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
      </button>
      {isOpen && (
        <div className="px-3 pb-3 border-t border-slate-100 dark:border-slate-800">
          <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{draft}</p>
          </div>
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={() => onCopy(draft, field)}>
              {isCopied ? <><Check size={11} className="mr-1" />Copied</> : <><Copy size={11} className="mr-1" />Copy</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}