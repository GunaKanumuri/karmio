import { Clock } from 'lucide-react';

interface BriefingData {
  new_matches: number;
  follow_ups_due: number;
  next_interview?: { company: string; type: string; day: string };
  callback_change?: string;
}

export function DailyBriefing({ data }: { data: BriefingData }) {
  const parts: string[] = [];
  if (data.new_matches > 0) parts.push(`${data.new_matches} new jobs match your profiles today`);
  if (data.follow_ups_due > 0) parts.push(`${data.follow_ups_due} follow-up${data.follow_ups_due > 1 ? 's' : ''} due today`);
  if (data.next_interview) parts.push(`${data.next_interview.type} interview with ${data.next_interview.company} on ${data.next_interview.day}`);
  if (data.callback_change) parts.push(`Callback rate ${data.callback_change} this week`);

  return (
    <div className="bg-karmio-50 dark:bg-karmio-900/20 border border-karmio-200 dark:border-karmio-800/50 rounded-xl px-5 py-4 flex gap-4 items-start">
      <div className="w-9 h-9 rounded-full bg-karmio-100 dark:bg-karmio-800/40 flex items-center justify-center flex-shrink-0">
        <Clock size={16} className="text-karmio-600 dark:text-karmio-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-karmio-800 dark:text-karmio-200 mb-1">Today&apos;s briefing</p>
        <p className="text-sm text-karmio-600 dark:text-karmio-300 leading-relaxed">
          {parts.join('. ')}.
        </p>
      </div>
    </div>
  );
}
