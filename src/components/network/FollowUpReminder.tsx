'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Clock, CheckCircle2, MessageSquare } from 'lucide-react';

interface FollowUpReminderProps {
  companyName: string;
  roleTitle: string;
  daysSince: number;
  isOverdue: boolean;
  onComplete?: () => void;
  onCraftMessage?: () => void;
}

export function FollowUpReminder({ companyName, roleTitle, daysSince, isOverdue, onComplete, onCraftMessage }: FollowUpReminderProps) {
  return (
    <div className={`rounded-xl p-4 flex items-center justify-between gap-4 border ${
      isOverdue
        ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50'
        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50'
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isOverdue ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-slate-100 dark:bg-slate-800'
        }`}>
          <Clock size={14} className={isOverdue ? 'text-amber-600' : 'text-slate-400'} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{companyName}</p>
          <p className="text-xs text-slate-500 truncate">{roleTitle} — {daysSince} day{daysSince !== 1 ? 's' : ''} since application</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {isOverdue && <Badge variant="warning">Overdue</Badge>}
        {!isOverdue && <Badge>Due in {7 - daysSince}d</Badge>}
        {onCraftMessage && (
          <Button size="sm" variant="ghost" onClick={onCraftMessage}>
            <MessageSquare size={13} className="mr-1" />Message
          </Button>
        )}
        {onComplete && (
          <Button size="sm" variant="ghost" onClick={onComplete}>
            <CheckCircle2 size={13} className="mr-1" />Done
          </Button>
        )}
      </div>
    </div>
  );
}
