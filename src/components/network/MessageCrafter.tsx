'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Sparkles, Copy, Check, RefreshCw } from 'lucide-react';

type MessageTone = 'professional' | 'casual' | 'referral' | 'technical';

interface MessageCrafterProps {
  contactName: string;
  contactTitle?: string;
  companyName?: string;
  roleTitle?: string;
  open: boolean;
  onClose: () => void;
}

const TONE_OPTIONS: { value: MessageTone; label: string; desc: string }[] = [
  { value: 'professional', label: 'Professional', desc: 'Formal, for senior professionals' },
  { value: 'casual', label: 'Casual', desc: 'Friendly, conversational peer outreach' },
  { value: 'referral', label: 'Referral ask', desc: 'Direct ask for internal referral' },
  { value: 'technical', label: 'Technical', desc: 'Lead with technical insight' },
];

export function MessageCrafter({ contactName, contactTitle, companyName, roleTitle, open, onClose }: MessageCrafterProps) {
  const [tone, setTone] = useState<MessageTone>('professional');
  const [role, setRole] = useState(roleTitle || '');
  const [company, setCompany] = useState(companyName || '');
  const [message, setMessage] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!company && !role) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'message',
          contact_name: contactName,
          contact_title: contactTitle || '',
          company, role, tone,
        }),
      });
      const json = await res.json();
      if (json.success && json.data?.content) {
        setMessage(json.data.content);
      } else {
        setError(json.error?.message || 'Could not generate message.');
      }
    } catch {
      setError('Network error — check your connection.');
    }
    setGenerating(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal open={open} onClose={onClose} title={`Message to ${contactName}`} size="lg">
      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">Tone</p>
          <div className="grid grid-cols-2 gap-2">
            {TONE_OPTIONS.map(t => (
              <button key={t.value} onClick={() => setTone(t.value)}
                className={`text-left p-3 rounded-lg border text-xs transition-all ${
                  tone === t.value ? 'border-karmio-500 bg-karmio-50 dark:bg-karmio-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}>
                <span className="font-medium text-slate-800 dark:text-slate-200">{t.label}</span>
                <p className="text-[10px] text-slate-500 mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Company" value={company} onChange={e => setCompany(e.target.value)} placeholder="Stripe" />
          <Input label="Role" value={role} onChange={e => setRole(e.target.value)} placeholder="Senior Software Engineer" />
        </div>
        <Button variant="primary" fullWidth onClick={handleGenerate} loading={generating} disabled={!company && !role}>
          <Sparkles size={14} className="mr-1" />{message ? 'Regenerate' : 'Generate message'}
        </Button>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {message && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Generated message</p>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={handleCopy}>
                  {copied ? <><Check size={13} className="text-emerald-500" /> Copied</> : <><Copy size={13} /> Copy</>}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleGenerate}><RefreshCw size={13} /></Button>
              </div>
            </div>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={8} className="font-mono text-xs" />
            <p className="text-[10px] text-slate-400 mt-1">Edit before copying. Personalizing improves response rates.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
