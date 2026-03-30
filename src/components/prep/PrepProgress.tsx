'use client';

import { useEffect, useState } from 'react';
import type { PrepStage } from '@/lib/ai/interview-prep';

const STAGE_LABELS: Record<PrepStage, string> = {
  hr: 'HR readiness',
  behavioral: 'Behavioral readiness',
  technical: 'Technical readiness',
  offer: 'Negotiation readiness',
};

function getColor(score: number) {
  if (score >= 80) return { stroke: '#10B981', text: 'text-emerald-600 dark:text-emerald-400', bg: '#ECFDF5', label: 'Ready' };
  if (score >= 50) return { stroke: '#1A56DB', text: 'text-karmio-600 dark:text-karmio-400', bg: '#EEF4FF', label: 'Getting there' };
  if (score >= 20) return { stroke: '#F59E0B', text: 'text-amber-600 dark:text-amber-400', bg: '#FFFBEB', label: 'Needs work' };
  return { stroke: '#94A3B8', text: 'text-slate-400', bg: '#F8FAFC', label: 'Not started' };
}

interface PrepProgressProps {
  score: number;
  stage: PrepStage;
  size?: number;
}

export function PrepProgress({ score, stage, size = 52 }: PrepProgressProps) {
  const [animScore, setAnimScore] = useState(0);
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const timer = setTimeout(() => setAnimScore(score), 150);
    return () => clearTimeout(timer);
  }, [score]);

  const progress = (animScore / 100) * circumference;
  const color = getColor(score);

  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill={color.bg} className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="3" />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color.stroke} strokeWidth="3"
            strokeDasharray={circumference} strokeDashoffset={circumference - progress} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center text-xs font-semibold ${color.text}`}>
          {animScore}%
        </div>
      </div>
      <span className={`text-[9px] font-semibold tracking-wide ${color.text}`}>{color.label}</span>
      <span className="text-[8px] text-slate-400 dark:text-slate-500">{STAGE_LABELS[stage]}</span>
    </div>
  );
}