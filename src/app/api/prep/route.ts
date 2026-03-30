import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } }, { status: 401 });

    const { data: rows, error } = await supabase
      .from('prep_practice')
      .select('question_key, answer_draft, confidence, updated_at')
      .eq('user_id', user.id);

    if (error) return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: 'Could not load prep state.' } }, { status: 500 });

    const stateMap: Record<string, any> = {};
    (rows || []).forEach((row: any) => {
      stateMap[row.question_key] = {
        answer: row.answer_draft || '',
        confidence: row.confidence || 'not_started',
        updated_at: row.updated_at,
      };
    });

    return NextResponse.json({ success: true, data: stateMap });
  } catch (err) {
    console.error('Prep GET error:', err);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Server error.' } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } }, { status: 401 });

    const { key, answer, confidence } = await req.json();
    if (!key || typeof key !== 'string') return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'key is required.' } }, { status: 400 });

    const updates: any = { user_id: user.id, question_key: key, updated_at: new Date().toISOString() };
    if (answer !== undefined) updates.answer_draft = answer;
    if (confidence !== undefined) updates.confidence = confidence;

    const { error } = await supabase.from('prep_practice').upsert(updates, { onConflict: 'user_id,question_key' });
    if (error) return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: 'Could not save.' } }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Prep POST error:', err);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Server error.' } }, { status: 500 });
  }
}