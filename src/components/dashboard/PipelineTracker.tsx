'use client';

import { BookmarkCheck, Send, Briefcase, Target } from 'lucide-react';

interface PipelineTrackerProps {
  saved: number;
  applied: number;
  interviews: number;
  offers: number;
}

const STAGES = [
  {
    key: 'saved',
    label: 'Saved',
    color: 'bg-blue-500',
    ring: 'ring-blue-200 dark:ring-blue-800',
    icon: <BookmarkCheck size={11} />,
  },
  {
    key: 'applied',
    label: 'Applied',
    color: 'bg-violet-500',
    ring: 'ring-violet-200 dark:ring-violet-800',
    icon: <Send size={11} />,
  },
  {
    key: 'interviews',
    label: 'Interviews',
    color: 'bg-amber-500',
    ring: 'ring-amber-200 dark:ring-amber-800',
    icon: <Briefcase size={11} />,
  },
  {
    key: 'offers',
    label: 'Offers',
    color: 'bg-emerald-500',
    ring: 'ring-emerald-200 dark:ring-emerald-800',
    icon: <Target size={11} />,
  },
] as const;

function getMotivationalText(saved: number, applied: number, interviews: number, offers: number): string {
  const total = saved + applied + interviews + offers;
  if (total === 0) return 'Start saving jobs!';
  if (offers > 0) return '🎉 Offers!';
  if (interviews > 0) return '🔥 Interviews in progress';
  if (applied > 0) return '💪 Keep applying';
  return '📌 Start applying!';
}

export function PipelineTracker({ saved, applied, interviews, offers }: PipelineTrackerProps) {
  const counts: Record<string, number> = { saved, applied, interviews, offers };
  const motivationalText = getMotivationalText(saved, applied, interviews, offers);

  return (
    <div>
      {STAGES.map((stage, i) => {
        const count = counts[stage.key];
        const hasCount = count > 0;
        const isLast = i === STAGES.length - 1;

        return (
          <div key={stage.label} className="flex items-center gap-2.5 relative">
            {/* Connector line to next stage */}
            {!isLast && (
              <div className="absolute left-[12px] top-[24px] w-[2px] h-[16px] bg-slate-200 dark:bg-slate-700" />
            )}

            {/* Stage dot */}
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-white flex-shrink-0 ${
                hasCount ? `${stage.color} ring-2 ${stage.ring}` : 'bg-slate-200 dark:bg-slate-700'
              }`}
            >
              {stage.icon}
            </div>

            {/* Label + count */}
            <div className="flex-1 flex items-center justify-between py-2">
              <span className={`text-[11px] ${
                hasCount ? 'font-medium text-slate-700 dark:text-slate-300' : 'text-slate-400'
              }`}>
                {stage.label}
              </span>
              <span className={`text-sm font-bold ${
                hasCount ? 'text-slate-900 dark:text-white' : 'text-slate-300 dark:text-slate-600'
              }`}>
                {count}
              </span>
            </div>
          </div>
        );
      })}

      <p className="text-[10px] text-slate-400 text-center italic mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        {motivationalText}
      </p>
    </div>
  );
}
