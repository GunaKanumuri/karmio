import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { z } from 'zod';

const DismissSchema = z.object({
  job_id: z.string().uuid(),
});

/**
 * POST /api/jobs/dismiss
 * Body: { job_id: string }
 *
 * Marks a job as dismissed for the current user by creating an application
 * record with status 'dismissed'. This hides it from the job feed via the
 * LEFT JOIN on user_job_matches / applications.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = DismissSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'job_id is required and must be a valid UUID.' } },
        { status: 400 }
      );
    }

    const { job_id } = parsed.data;

    // Upsert so dismissing twice is idempotent
    const { error } = await supabase
      .from('applications')
      .upsert(
        {
          user_id: user.id,
          job_id,
          status: 'dismissed',
          match_score: 0,
        },
        { onConflict: 'user_id,job_id', ignoreDuplicates: false }
      );

    if (error) {
      console.error('[POST /api/jobs/dismiss]', error.message);
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: 'Could not dismiss job.', retryable: true } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: { job_id, dismissed: true } });
  } catch (err: any) {
    console.error('[POST /api/jobs/dismiss] Fatal:', err.message);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.', retryable: true } },
      { status: 500 }
    );
  }
}
