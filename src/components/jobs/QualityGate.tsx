'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface QualityGateProps {
  matchScore: number;
  experienceGap?: string;
  alternatives?: number;
  onViewAlternatives?: () => void;
  onApplyAnyway?: () => void;
}

export function QualityGate({ matchScore, experienceGap, alternatives = 0, onViewAlternatives, onApplyAnyway }: QualityGateProps) {
  if (matchScore >= 40) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mt-2">
      <div className="flex gap-3 items-start">
        <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">This might be a stretch</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 leading-relaxed">
            Your match score is {matchScore}% for this role.
            {experienceGap && ` ${experienceGap}.`}
            {' '}The system still shows it because some of your skills are relevant.
          </p>
          {alternatives > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
              We found {alternatives} better-fit alternatives for your profile.
            </p>
          )}
          <div className="flex gap-2 mt-3">
            {onViewAlternatives && <Button size="sm" onClick={onViewAlternatives}>See alternatives</Button>}
            {onApplyAnyway && <Button size="sm" variant="ghost" onClick={onApplyAnyway}>Apply anyway</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}
