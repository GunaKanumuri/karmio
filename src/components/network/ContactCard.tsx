'use client';

import { IContact, IMessage, IFollowUp, MessageTone } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { WhyHelper } from '@/components/shared/Helpers';
import { MESSAGE_TONES } from '@/lib/constants';
import { useState } from 'react';
import { Linkedin, Mail, Clock, CheckCircle } from 'lucide-react';

// === ContactCard ===
export function ContactCard({ contact, onMessage }: { contact: IContact; onMessage?: () => void }) {
  const statusColors: Record<string, 'default' | 'info' | 'success' | 'warning'> = {
    pending: 'default', connected: 'info', responded: 'success', no_response: 'warning',
  };

  return (
    <Card padding="sm" hoverable>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-medium text-slate-500">
          {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{contact.name}</p>
          <p className="text-xs text-slate-500 truncate">{contact.title}</p>
        </div>
        <Badge variant={statusColors[contact.connection_status] || 'default'}>
          {contact.connection_status.replace('_', ' ')}
        </Badge>
      </div>
      <div className="flex gap-2 mt-3">
        {contact.linkedin_url && (
          <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="ghost"><Linkedin size={14} /> LinkedIn</Button>
          </a>
        )}
        {contact.email && (
          <a href={`mailto:${contact.email}`}>
            <Button size="sm" variant="ghost"><Mail size={14} /> Email</Button>
          </a>
        )}
        {onMessage && <Button size="sm" onClick={onMessage}>Craft message</Button>}
      </div>
    </Card>
  );
}

// === MessageCrafter ===
interface MessageCrafterProps {
  contactName: string;
  companyName: string;
  roleTitle: string;
  onGenerate: (tone: MessageTone) => Promise<string>;
  onSend: (content: string, tone: MessageTone) => void;
}

export function MessageCrafter({ contactName, companyName, roleTitle, onGenerate, onSend }: MessageCrafterProps) {
  const [selectedTone, setSelectedTone] = useState<MessageTone>('professional');
  const [message, setMessage] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    const content = await onGenerate(selectedTone);
    setMessage(content);
    setGenerating(false);
  };

  return (
    <div>
      <WhyHelper className="mb-3">
        Candidates who send at least one outreach message per application get 3x more callbacks.
        Choose a tone that matches your relationship with this contact.
      </WhyHelper>

      <p className="text-xs text-slate-500 mb-2">
        Message for <strong>{contactName}</strong> at {companyName} — re: {roleTitle}
      </p>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {MESSAGE_TONES.map((tone) => (
          <button key={tone.value} onClick={() => setSelectedTone(tone.value as MessageTone)}
            className={`text-left p-3 rounded-lg border text-xs transition-all ${
              selectedTone === tone.value
                ? 'border-karmio-500 bg-karmio-50 dark:bg-karmio-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}>
            <p className="font-medium text-slate-700 dark:text-slate-200">{tone.label}</p>
            <p className="text-slate-500 mt-0.5">{tone.description}</p>
          </button>
        ))}
      </div>

      <Button size="sm" onClick={handleGenerate} loading={generating} className="mb-3">
        Generate {selectedTone} message
      </Button>

      {message && (
        <>
          <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={6}
            label="Generated message — edit as needed" />
          <div className="flex gap-2 mt-3 justify-end">
            <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(message)}>
              Copy to clipboard
            </Button>
            <Button size="sm" variant="primary" onClick={() => onSend(message, selectedTone)}>
              Mark as sent
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// === FollowUpReminder ===
export function FollowUpReminder({ followUp, companyName, onComplete }: {
  followUp: IFollowUp; companyName?: string; onComplete: () => void;
}) {
  const isOverdue = new Date(followUp.due_date) < new Date() && !followUp.is_completed;

  return (
    <Card padding="sm" className={isOverdue ? 'border-amber-300 dark:border-amber-700' : ''}>
      <div className="flex items-center gap-3">
        {followUp.is_completed ? (
          <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
        ) : (
          <Clock size={16} className={`flex-shrink-0 ${isOverdue ? 'text-amber-500' : 'text-slate-400'}`} />
        )}
        <div className="flex-1">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            Day {followUp.day_number} — {followUp.type} follow-up
            {companyName && <span className="text-slate-500"> • {companyName}</span>}
          </p>
          <p className={`text-xs ${isOverdue ? 'text-amber-600 font-medium' : 'text-slate-500'}`}>
            Due: {new Date(followUp.due_date).toLocaleDateString()}
            {isOverdue && ' — Overdue!'}
          </p>
        </div>
        {!followUp.is_completed && (
          <Button size="sm" variant="ghost" onClick={onComplete}>Mark done</Button>
        )}
      </div>
    </Card>
  );
}
