'use client';

import { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton, UpgradePrompt, WhyHelper } from '@/components/shared/Helpers';
import { useAuth } from '@/hooks/useAuth';
import { useContacts, useGenerateMessage } from '@/hooks/useNetwork';
import { TIER_LIMITS } from '@/lib/constants';
import { MessageTone } from '@/types';
import {
  MessageSquare, Sparkles, Copy, Check, Search,
  User, Briefcase, ExternalLink, RefreshCw,
} from 'lucide-react';

// ─── Tone config ──────────────────────────────────────────────────────────────

const TONES: { key: MessageTone; label: string; desc: string; color: string }[] = [
  {
    key: 'professional',
    label: 'Professional',
    desc: 'Formal, respectful — good for senior contacts',
    color: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  },
  {
    key: 'casual',
    label: 'Casual',
    desc: 'Friendly, peer-to-peer — good for similar-level contacts',
    color: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
  },
  {
    key: 'referral',
    label: 'Referral ask',
    desc: 'Direct ask for an internal referral',
    color: 'border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300',
  },
  {
    key: 'technical',
    label: 'Technical',
    desc: 'Lead with a technical insight — good for engineers',
    color: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const { user } = useAuth();
  const { data: contacts = [], isLoading } = useContacts();
  const generateMessage = useGenerateMessage();

  const tier = (user?.subscription_tier || 'free') as keyof typeof TIER_LIMITS;
  const limits = TIER_LIMITS[tier];
  const canGenerate = (limits.messages_per_week ?? 0) > 0;

  // Search / filter
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c: any) =>
        c.name?.toLowerCase().includes(q) ||
        c.company_name?.toLowerCase().includes(q) ||
        c.title?.toLowerCase().includes(q),
    );
  }, [contacts, search]);

  // Modal state
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [tone, setTone] = useState<MessageTone>('professional');
  const [role, setRole] = useState('');
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function openModal(contact: any) {
    setSelectedContact(contact);
    setRole('');
    setGeneratedMessage(null);
    setGenerateError(null);
    setTone('professional');
  }

  function closeModal() {
    setSelectedContact(null);
    setGeneratedMessage(null);
    setGenerateError(null);
  }

  async function handleGenerate() {
    if (!selectedContact) return;
    setGenerateError(null);
    setGeneratedMessage(null);

    try {
      const res = await generateMessage.mutateAsync({
        contact_id: selectedContact.id,
        contact_name: selectedContact.name,
        contact_title: selectedContact.title || '',
        company: selectedContact.company_name || '',
        role: role.trim() || selectedContact.last_job_title || 'this role',
        tone,
      });

      const data = (res as any)?.data;
      if ((res as any)?.success && data?.content) {
        setGeneratedMessage(data.content);
      } else {
        setGenerateError((res as any)?.error?.message || 'Could not generate message. Try again.');
      }
    } catch {
      setGenerateError('Network error — please try again.');
    }
  }

  function handleCopy() {
    if (!generatedMessage) return;
    navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <div className="max-w-3xl">
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare size={20} className="text-slate-400" />
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Outreach messages</h1>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          Generate personalised LinkedIn or email messages for your contacts using AI.
        </p>

        <WhyHelper className="mb-5">
          Pick a contact, choose your tone, and get a ready-to-send message in seconds.
          Referral messages get up to 10× more responses than cold applications.
        </WhyHelper>

        {/* Upgrade prompt for free users who have hit the limit */}
        {!canGenerate && (
          <div className="mb-5">
            <UpgradePrompt feature="AI outreach messages" tierNeeded="Popular" />
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contacts by name or company..."
            className="input-field pl-9 text-sm"
          />
        </div>

        {/* Contact list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4">
                <Skeleton lines={2} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-10 text-center">
            <User size={28} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
              {contacts.length === 0 ? 'No contacts yet' : 'No contacts match your search'}
            </p>
            <p className="text-xs text-slate-400">
              {contacts.length === 0
                ? 'Add contacts from the Contacts page or from job applications.'
                : 'Try a different name or company.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((contact: any) => (
              <ContactRow
                key={contact.id}
                contact={contact}
                canGenerate={canGenerate}
                onGenerate={() => openModal(contact)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Generate modal ── */}
      {selectedContact && (
        <Modal
          open={true}
          onClose={closeModal}
          title={`Message to ${selectedContact.name}`}
          size="lg"
        >
          <div className="space-y-4">
            {/* Contact info */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="w-9 h-9 rounded-full bg-karmio-100 dark:bg-karmio-900/30 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-karmio-600 dark:text-karmio-400">
                  {selectedContact.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{selectedContact.name}</p>
                <p className="text-xs text-slate-500">
                  {selectedContact.title && `${selectedContact.title} · `}{selectedContact.company_name}
                </p>
              </div>
              {selectedContact.linkedin_url && (
                <a
                  href={selectedContact.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="View LinkedIn"
                >
                  <ExternalLink size={13} className="text-slate-400" />
                </a>
              )}
            </div>

            {/* Role input */}
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                Which role are you reaching out about? <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={role}
                onChange={e => setRole(e.target.value)}
                placeholder={`e.g. Software Engineer at ${selectedContact.company_name || 'this company'}`}
                className="input-field text-sm"
              />
            </div>

            {/* Tone picker */}
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 block">Tone</label>
              <div className="grid grid-cols-2 gap-2">
                {TONES.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTone(t.key)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      tone === t.key
                        ? t.color + ' border-current'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <p className="text-xs font-semibold">{t.label}</p>
                    <p className="text-[10px] mt-0.5 opacity-80">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <Button
              onClick={handleGenerate}
              disabled={generateMessage.isPending}
              className="w-full"
            >
              {generateMessage.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  {generatedMessage ? 'Regenerate' : 'Generate message'}
                </>
              )}
            </Button>

            {/* Error */}
            {generateError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl">
                <p className="text-xs text-red-600 dark:text-red-400">{generateError}</p>
              </div>
            )}

            {/* Generated message */}
            {generatedMessage && (
              <div className="relative">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {generatedMessage}
                  </p>
                </div>
                <button
                  onClick={handleCopy}
                  className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-slate-700 transition-colors"
                >
                  {copied ? (
                    <><Check size={10} className="text-emerald-500" /> Copied!</>
                  ) : (
                    <><Copy size={10} /> Copy</>
                  )}
                </button>
                <p className="text-[10px] text-slate-400 mt-2">
                  Tip: Personalise before sending — mention something specific about their work.
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </AppShell>
  );
}

// ─── Contact row ──────────────────────────────────────────────────────────────

function ContactRow({
  contact,
  canGenerate,
  onGenerate,
}: {
  contact: any;
  canGenerate: boolean;
  onGenerate: () => void;
}) {
  const messageCount = contact.messages?.length ?? 0;

  return (
    <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          {contact.name?.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{contact.name}</p>
          {messageCount > 0 && (
            <Badge variant="info">{messageCount} msg{messageCount > 1 ? 's' : ''}</Badge>
          )}
        </div>
        <p className="text-xs text-slate-500 truncate">
          {contact.title && `${contact.title} · `}{contact.company_name || 'No company'}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {contact.linkedin_url && (
          <a
            href={contact.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="LinkedIn profile"
          >
            <ExternalLink size={13} />
          </a>
        )}
        {canGenerate ? (
          <Button size="sm" variant="ghost" onClick={onGenerate}>
            <Sparkles size={12} /> Write message
          </Button>
        ) : (
          <Badge variant="default">Upgrade</Badge>
        )}
      </div>
    </div>
  );
}
