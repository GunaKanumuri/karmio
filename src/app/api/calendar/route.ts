import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

// GET /api/calendar — list events for a date range
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } }, { status: 401 });

    const from = req.nextUrl.searchParams.get('from');
    const to = req.nextUrl.searchParams.get('to');

    let query = supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user.id)
      .order('event_date', { ascending: true });

    if (from) query = query.gte('event_date', from);
    if (to) query = query.lte('event_date', to);

    const { data, error } = await query;
    if (error) return NextResponse.json({ success: false, error: { code: 'QUERY_FAILED', message: 'Could not fetch events.' } }, { status: 500 });

    return NextResponse.json({ success: true, data: data || [] });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } }, { status: 500 });
  }
}

// POST /api/calendar — create event
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } }, { status: 401 });

    const body = await req.json();
    const { event_date, event_type, title, notes, time_slot, application_id, company_name } = body;

    if (!event_date || !event_type || !title) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: 'event_date, event_type, and title are required.' } }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        user_id: user.id,
        event_date,
        event_type,
        title,
        notes: notes || null,
        time_slot: time_slot || null,
        application_id: application_id || null,
        company_name: company_name || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ success: false, error: { code: 'INSERT_FAILED', message: 'Could not create event.' } }, { status: 500 });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } }, { status: 500 });
  }
}

// PUT /api/calendar — update event (toggle complete, edit)
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } }, { status: 401 });

    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: 'id is required.' } }, { status: 400 });

    const { data, error } = await supabase
      .from('calendar_events')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ success: false, error: { code: 'UPDATE_FAILED', message: 'Could not update event.' } }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } }, { status: 500 });
  }
}

// DELETE /api/calendar — remove event
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } }, { status: 401 });

    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: { code: 'VALIDATION', message: 'id is required.' } }, { status: 400 });

    await supabase.from('calendar_events').delete().eq('id', id).eq('user_id', user.id);
    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } }, { status: 500 });
  }
}