'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, Clock, CheckCircle2, Circle, Minus, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { PrepStage, PrepQuestion } from '@/lib/ai/interview-prep';

export type ConfidenceLevel = 'not_started' | 'practiced' | 'confident';

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, { label: string; icon: any; color: string; bg: string }> = {
  not_started: {
    label: 'Not started',
    icon: Circle,
    color: 'text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-800 text-slate-500',
  },
  practiced: {
    label: 'Practiced',
    icon: Minus,
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  },
  confident: {
    label: 'Confident',
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  },
};

const STAGE_COLORS: Record<PrepStage, string> = {
  hr: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  behavioral: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
  technical: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
  offer: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
};

interface PracticeCardProps {
  index: number;
  question: PrepQuestion;
  stage: PrepStage;
  savedAnswer: string;
  confidence: ConfidenceLevel;
  onSaveAnswer: (answer: string) => void;
  onUpdateConfidence: (level: ConfidenceLevel) => void;
}

export function PracticeCard({
  index,
  question,
  stage,
  savedAnswer,
  confidence,
  onSaveAnswer,
  onUpdateConfidence,
}: PracticeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [answer, setAnswer] = useState(savedAnswer);
  const [dirty, setDirty] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(90);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync external saved answer
  useEffect(() => {
    if (!dirty) setAnswer(savedAnswer);
  }, [savedAnswer, dirty]);

  // Timer logic
  useEffect(() => {
    if (timerActive && timerSeconds > 0) {
      timerRef.current = setTimeout(() => setTimerSeconds(s => s - 1), 1000);
    } else if (timerSeconds === 0) {
      setTimerActive(false);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timerActive, timerSeconds]);

  const resetTimer = () => { setTimerActive(false); setTimerSeconds(90); };
  const toggleTimer = () => { if (timerSeconds === 0) resetTimer(); else setTimerActive(!timerActive); };

  const handleSave = useCallback(() => {
    onSaveAnswer(answer);
    setDirty(false);
    if (answer.trim().length > 20 && confidence === 'not_started') {
      onUpdateConfidence('practiced');
    }
  }, [answer, confidence, onSaveAnswer, onUpdateConfidence]);

  const cycleConfidence = () => {
    const order: ConfidenceLevel[] = ['not_started', 'practiced', 'confident'];
    const next = order[(order.indexOf(confidence) + 1) % order.length];
    onUpdateConfidence(next);
  };

  const conf = CONFIDENCE_CONFIG[confidence];
  const ConfIcon = conf.icon;
  const timerColor = timerSeconds <= 15 ? 'text-red-500' : timerSeconds <= 30 ? 'text-amber-500' : 'text-slate-500';

  return (
    <div className={`bg-white dark:bg-slate-900 border rounded-xl overflow-hidden transition-all ${
      confidence === 'confident'
        ? 'border-emerald-200 dark:border-emerald-800/50'
        : 'border-slate-200 dark:border-slate-700/50'
    }`}>
      {/* ─── Header (always visible) ──────────────────────────────────── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0 ${STAGE_COLORS[stage]}`}>
            {index + 1}
          </span>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
            {question.question}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <button
            onClick={(e) => { e.stopPropagation(); cycleConfidence(); }}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${conf.bg}`}
            title={`Click to change: ${conf.label}`}
          >
            <ConfIcon size={10} />
            <span className="hidden sm:inline">{conf.label}</span>
          </button>
          {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {/* ─── Expanded content ─────────────────────────────────────────── */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 space-y-3">
          {/* Tip */}
          <div className="ml-9">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 space-y-2">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {question.tip}
              </p>

              {question.framework && (
                <p className="text-[10px] font-medium text-karmio-500">
                  Framework: {question.framework}
                </p>
              )}

              {/* Example answer skeleton */}
              {question.skeleton && (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/50">
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Answer structure:
                  </p>
                  <div className="space-y-1">
                    {question.skeleton.map((line, i) => (
                      <p key={i} className="text-[11px] text-slate-500 dark:text-slate-400 flex gap-1.5 leading-relaxed">
                        <span className="text-karmio-400 flex-shrink-0">{i + 1}.</span>
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Do / Don't */}
              {(question.dos || question.donts) && (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/50 grid grid-cols-2 gap-3">
                  {question.dos && (
                    <div>
                      <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 mb-1">Do</p>
                      {question.dos.map((d, i) => (
                        <p key={i} className="text-[10px] text-slate-500 leading-relaxed">
                          <span className="text-emerald-500">✓</span> {d}
                        </p>
                      ))}
                    </div>
                  )}
                  {question.donts && (
                    <div>
                      <p className="text-[10px] font-medium text-red-500 dark:text-red-400 mb-1">Don't</p>
                      {question.donts.map((d, i) => (
                        <p key={i} className="text-[10px] text-slate-500 leading-relaxed">
                          <span className="text-red-400">✗</span> {d}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Practice textarea */}
          <div className="ml-9">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                Draft your answer
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleTimer}
                  className={`flex items-center gap-1 text-[10px] font-mono font-medium ${timerColor} hover:opacity-80 transition-opacity`}
                >
                  <Clock size={10} />
                  {Math.floor(timerSeconds / 60)}:{String(timerSeconds % 60).padStart(2, '0')}
                  {timerActive ? ' ⏸' : timerSeconds < 90 ? ' ▶' : ' ▶ 90s'}
                </button>
                {timerSeconds < 90 && (
                  <button onClick={resetTimer} className="text-slate-400 hover:text-slate-600">
                    <RotateCcw size={10} />
                  </button>
                )}
              </div>
            </div>
            <textarea
              ref={textareaRef}
              value={answer}
              onChange={(e) => { setAnswer(e.target.value); setDirty(true); }}
              placeholder={question.skeleton
                ? `Start with: "${question.skeleton[0]}" ...`
                : 'Type your practice answer here...'}
              rows={4}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-karmio-500/20 focus:border-karmio-500 resize-y"
            />
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-[10px] text-slate-400">
                {answer.trim().split(/\s+/).filter(Boolean).length} words
                {answer.trim().split(/\s+/).filter(Boolean).length > 150 && (
                  <span className="text-amber-500 ml-1">— consider trimming for a 2-min answer</span>
                )}
              </p>
              {dirty && (
                <Button variant="ghost" size="sm" onClick={handleSave}>
                  <Save size={11} /> Save
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}