'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Sparkles, RotateCcw, Star } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { fetchAPI } from '@/hooks/useJobs';
import type { PrepStage } from '@/lib/ai/interview-prep';

interface Message {
  role: 'interviewer' | 'user' | 'feedback';
  content: string;
  feedback?: {
    clarity: number;
    relevance: number;
    structure: number;
    overall: number;
    strengths: string[];
    improvements: string[];
  };
}

interface MockInterviewProps {
  application: any;
  stage: PrepStage;
  onClose: () => void;
}

const STAGE_PERSONAS: Record<PrepStage, string> = {
  hr: 'HR recruiter',
  behavioral: 'hiring manager',
  technical: 'senior engineer',
  offer: 'talent acquisition lead',
};

export function MockInterview({ application, stage, onClose }: MockInterviewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const companyName = application.job?.company_name || 'the company';
  const jobTitle = application.job?.title || 'this role';
  const persona = STAGE_PERSONAS[stage];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const startInterview = useCallback(async () => {
    setStarted(true);
    setLoading(true);
    try {
      const res = await fetchAPI<any>('/ai/mock', {
        method: 'POST',
        body: JSON.stringify({
          action: 'start',
          application_id: application.id,
          stage,
          job_title: jobTitle,
          company_name: companyName,
          parsed_jd: application.job?.description_parsed || null,
        }),
      });
      if (res.success && res.data?.question) {
        setMessages([{ role: 'interviewer', content: res.data.question }]);
        setQuestionCount(1);
      } else {
        setMessages([{
          role: 'interviewer',
          content: `Hi! I'm your mock ${persona} from ${companyName}. Let's start — tell me about yourself and why you're interested in the ${jobTitle} role.`,
        }]);
        setQuestionCount(1);
      }
    } catch {
      setMessages([{
        role: 'interviewer',
        content: `Hi! I'm your mock ${persona} from ${companyName}. Let's start — tell me about yourself and why you're interested in the ${jobTitle} role.`,
      }]);
      setQuestionCount(1);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [application, stage, jobTitle, companyName, persona]);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const conversationHistory = [...messages, userMsg].map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.role === 'feedback' ? `[Feedback]: ${m.content}` : m.content,
      }));

      const res = await fetchAPI<any>('/ai/mock', {
        method: 'POST',
        body: JSON.stringify({
          action: 'respond',
          application_id: application.id,
          stage,
          job_title: jobTitle,
          company_name: companyName,
          parsed_jd: application.job?.description_parsed || null,
          history: conversationHistory,
          question_number: questionCount,
        }),
      });

      if (res.success && res.data) {
        if (res.data.feedback) {
          setMessages(prev => [...prev, {
            role: 'feedback',
            content: res.data.feedback_text || 'Here\'s my feedback on your answer:',
            feedback: res.data.feedback,
          }]);
        }

        if (questionCount >= 5 || res.data.session_complete) {
          setSessionComplete(true);
        } else if (res.data.next_question) {
          setTimeout(() => {
            setMessages(prev => [...prev, { role: 'interviewer', content: res.data.next_question }]);
            setQuestionCount(c => c + 1);
          }, 800);
        }
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'feedback',
        content: 'Could not get AI feedback — network error. Try answering the next question.',
      }]);
    }

    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [input, loading, messages, application, stage, jobTitle, companyName, questionCount]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 dark:bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-karmio-50 dark:bg-karmio-900/30 flex items-center justify-center">
              <Sparkles size={14} className="text-karmio-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Mock {stage === 'hr' ? 'HR screen' : stage} interview
              </p>
              <p className="text-[10px] text-slate-500">
                {companyName} — {jobTitle}
                {questionCount > 0 && ` · Q${questionCount}/5`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1">
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {!started ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-14 h-14 rounded-2xl bg-karmio-50 dark:bg-karmio-900/30 flex items-center justify-center mb-4">
                <Sparkles size={22} className="text-karmio-500" />
              </div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                Ready for your mock {stage} interview?
              </p>
              <p className="text-xs text-slate-500 mb-4 max-w-xs">
                I'll act as a {persona} from {companyName}. 5 questions tailored to the {jobTitle} role with feedback after each.
              </p>
              <Button variant="primary" size="md" onClick={startInterview} loading={loading}>
                <Sparkles size={13} /> Start interview
              </Button>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i}>
                  {msg.role === 'interviewer' && (
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-karmio-100 dark:bg-karmio-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles size={12} className="text-karmio-600 dark:text-karmio-400" />
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  )}

                  {msg.role === 'user' && (
                    <div className="flex justify-end">
                      <div className="bg-karmio-500 text-white rounded-xl rounded-tr-sm px-4 py-3 max-w-[85%]">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  )}

                  {msg.role === 'feedback' && (
                    <div className="mx-3">
                      <div className="bg-karmio-50/50 dark:bg-karmio-900/10 border border-karmio-200 dark:border-karmio-800/50 rounded-xl px-4 py-3">
                        <p className="text-[10px] font-medium text-karmio-600 dark:text-karmio-400 mb-2 flex items-center gap-1">
                          <Sparkles size={10} /> AI Feedback
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3 whitespace-pre-wrap">
                          {msg.content}
                        </p>

                        {msg.feedback && (
                          <>
                            <div className="grid grid-cols-3 gap-2 mb-3">
                              {(['clarity', 'relevance', 'structure'] as const).map(metric => (
                                <div key={metric} className="bg-white dark:bg-slate-800/50 rounded-lg p-2">
                                  <p className="text-[9px] text-slate-500 capitalize mb-1">{metric}</p>
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                      <div className="h-full bg-karmio-500 rounded-full transition-all duration-500"
                                        style={{ width: `${(msg.feedback![metric] / 5) * 100}%` }} />
                                    </div>
                                    <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                                      {msg.feedback![metric]}/5
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              {msg.feedback.strengths.length > 0 && (
                                <div>
                                  <p className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400 mb-1">Strengths</p>
                                  {msg.feedback.strengths.map((s, j) => (
                                    <p key={j} className="text-[10px] text-slate-500 leading-relaxed">
                                      <span className="text-emerald-500">+</span> {s}
                                    </p>
                                  ))}
                                </div>
                              )}
                              {msg.feedback.improvements.length > 0 && (
                                <div>
                                  <p className="text-[9px] font-medium text-amber-600 dark:text-amber-400 mb-1">Improve</p>
                                  {msg.feedback.improvements.map((s, j) => (
                                    <p key={j} className="text-[10px] text-slate-500 leading-relaxed">
                                      <span className="text-amber-500">→</span> {s}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-karmio-100 dark:bg-karmio-900/40 flex items-center justify-center flex-shrink-0">
                    <Sparkles size={12} className="text-karmio-600 dark:text-karmio-400" />
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full animate-pulse" />
                      <div className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
                      <div className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                    </div>
                  </div>
                </div>
              )}

              {sessionComplete && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4 text-center">
                  <Star size={20} className="text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-1">
                    Mock interview complete!
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-3">
                    You answered {questionCount} questions. Review the feedback above.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button variant="secondary" size="sm" onClick={() => {
                      setMessages([]); setQuestionCount(0); setSessionComplete(false); setStarted(false);
                    }}>
                      <RotateCcw size={11} /> New session
                    </Button>
                    <Button variant="primary" size="sm" onClick={onClose}>Done</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Input */}
        {started && !sessionComplete && (
          <div className="border-t border-slate-200 dark:border-slate-700/50 p-4">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your answer... (Shift+Enter for new line)"
                rows={2}
                className="flex-1 px-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 placeholder:text-slate-400 focus:ring-2 focus:ring-karmio-500/20 focus:border-karmio-500 resize-none"
                disabled={loading}
              />
              <Button variant="primary" size="md" onClick={handleSubmit} disabled={!input.trim() || loading} className="self-end">
                <Send size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}