import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { updateApplicationSchema, validateInput } from '@/lib/validation/schemas';
import { FOLLOW_UP_SCHEDULE } from '@/lib/constants';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } },
        { status: 401 }
      );
    }

    const { data: application, error } = await supabase
      .from('applications')
      .select('*, job:job_postings(id, company_name, title, location, source_url, remote_type)')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (error || !application) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Application not found.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: application });
  } catch (err) {
    console.error('[GET /api/applications/[id]]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.', retryable: true } },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } },
        { status: 401 }
      );
    }

    const body = await req.json();
    // Use the existing validation schema — inject the id from URL
    const input = { ...body, id: params.id };
    const validation = validateInput(updateApplicationSchema, input);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: validation.error } },
        { status: 400 }
      );
    }

    const { id, _delete, ...updates } = validation.data as any;

    // Handle deletion
    if (_delete) {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        return NextResponse.json(
          { success: false, error: { code: 'DELETE_FAILED', message: 'Could not delete application.' } },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, data: { deleted: true } });
    }

    // Add timestamp
    (updates as any).updated_at = new Date().toISOString();

    // Set applied_at when first moving to "applied"
    if (updates.status === 'applied') {
      updates.applied_at = new Date().toISOString();
    }

    const { data: application, error } = await supabase
      .from('applications')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*, job:job_postings(id, company_name, title, location)')
      .single();

    if (error || !application) {
      console.error('[PUT /api/applications/[id]] update error:', error);
      return NextResponse.json(
        { success: false, error: { code: 'UPDATE_FAILED', message: 'Could not update application.' } },
        { status: 404 }
      );
    }

    // Auto-create follow-ups when status changes to "applied"
    if (updates.status === 'applied' && application.applied_at) {
      try {
        const appliedDate = new Date(application.applied_at);
        const followUps = FOLLOW_UP_SCHEDULE.map((dayOffset, index) => ({
          application_id: application.id,
          user_id: user.id,
          due_date: new Date(appliedDate.getTime() + dayOffset * 86400000).toISOString(),
          type: index === 0 ? 'recruiter' : 'general',
          day_number: dayOffset,
          is_completed: false,
        }));

        await supabase.from('follow_ups').insert(followUps);
      } catch (followUpErr) {
        // Non-blocking — log but don't fail the main request
        console.error('[PUT /api/applications/[id]] follow-up creation error:', followUpErr);
      }
    }

    return NextResponse.json({ success: true, data: application });
  } catch (err) {
    console.error('[PUT /api/applications/[id]]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.', retryable: true } },
      { status: 500 }
    );
  }
}