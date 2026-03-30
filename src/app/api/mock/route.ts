import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { checkTierAccess } from '@/lib/payments/tier-gate';
import { buildMockInterviewPrompt, type PrepStage } from '@/lib/ai/interview-prep';
import type { SubscriptionTier } from '@/types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier || 'free') as SubscriptionTier;
    const gate = checkTierAccess(tier, 'interview_prep');
    if (!gate.allowed) return NextResponse.json({ success: false, error: { code: 'TIER_LIMIT_REACHED', message: gate.reason!, action: gate.upgrade_message } }, { status: 403 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ success: false, error: { code: 'CONFIG_ERROR', message: 'AI not configured.' } }, { status: 500 });

    const body = await req.json();
    const { action, stage, job_title, company_name, parsed_jd, history, question_number } = body;

    if (!action || !stage) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'action and stage required.' } }, { status: 400 });

    const systemPrompt = buildMockInterviewPrompt(
      stage as PrepStage, job_title || 'Software Engineer', company_name || 'the company',
      parsed_jd, question_number || 1, action,
    );

    const messages: { role: string; content: string }[] = [];
    if (action === 'start') {
      messages.push({ role: 'user', content: 'Start the interview.' });
    } else if (action === 'respond' && history?.length) {
      history.forEach((msg: any) => messages.push({ role: msg.role, content: msg.content }));
    } else {
      messages.push({ role: 'user', content: 'Continue the interview.' });
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1500, system: systemPrompt, messages }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    if (action === 'start') return NextResponse.json({ success: true, data: { question: text.trim() } });

    try {
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      return NextResponse.json({ success: true, data: parsed });
    } catch {
      return NextResponse.json({
        success: true,
        data: {
          feedback_text: text.trim(),
          feedback: { clarity: 3, relevance: 3, structure: 3, overall: 3, strengths: ['Good effort'], improvements: ['Be more specific with examples'] },
          next_question: question_number < 5 ? 'Tell me about a challenging project you worked on.' : null,
          session_complete: question_number >= 5,
        },
      });
    }
  } catch (err) {
    console.error('Mock interview error:', err);
    return NextResponse.json({ success: false, error: { code: 'AI_GENERATION_FAILED', message: 'Mock interview error.', retryable: true } }, { status: 500 });
  }
}