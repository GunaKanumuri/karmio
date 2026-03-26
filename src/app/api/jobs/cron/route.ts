import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/jobs/cron
 *
 * Vercel Cron fires this every 2 hours (configured in vercel.json).
 * Vercel always uses GET for crons, and automatically sets:
 *   Authorization: Bearer <CRON_SECRET>
 * when CRON_SECRET is set in your Vercel project env vars.
 *
 * This route verifies the secret, then internally calls POST /api/jobs/fetch
 * so all the real fetch logic stays in one place.
 *
 * Schedule: 0 '*'/2 * * * (every 2 hours = 12 runs/day)
 * Each run rotates through a department group to maximize coverage.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Reject if secret doesn't match
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[cron] Unauthorized trigger attempt');
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const startedAt = new Date().toISOString();

  // ─── Determine which department group to focus this run ───────────────────
  // 12 cron runs per day (every 2 hours).
  // We rotate through department groups so every category gets fresh jobs.
  const hour = new Date().getUTCHours();
  const runSlot = Math.floor(hour / 2); // 0-11

  // Department rotation: each slot focuses on 1-2 departments
  const DEPARTMENT_ROTATION: Record<number, string[]> = {
    0:  ['engineering', 'data'],           // 00:00 UTC
    1:  ['design', 'product'],             // 02:00 UTC
    2:  ['finance', 'accounting'],         // 04:00 UTC
    3:  ['marketing', 'sales'],            // 06:00 UTC
    4:  ['hr', 'operations'],              // 08:00 UTC
    5:  ['engineering', 'devops'],          // 10:00 UTC
    6:  ['product', 'management'],         // 12:00 UTC
    7:  ['design', 'creative'],            // 14:00 UTC
    8:  ['finance', 'legal'],              // 16:00 UTC
    9:  ['engineering', 'security'],        // 18:00 UTC
    10: ['marketing', 'growth'],           // 20:00 UTC
    11: ['data', 'ml'],                    // 22:00 UTC
  };

  const focusDepartments = DEPARTMENT_ROTATION[runSlot] || ['engineering'];

  try {
    const origin = req.nextUrl.origin;

    const res = await fetch(`${origin}/api/jobs/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cronSecret || ''}`,
      },
      body: JSON.stringify({
        secret: cronSecret,
        triggered_by: 'vercel-cron',
        focus_departments: focusDepartments,
        run_slot: runSlot,
      }),
    });

    const json = await res.json();

    if (!json.success) {
      console.error('[cron] Fetch returned failure:', JSON.stringify(json));
      return NextResponse.json(
        { success: false, started_at: startedAt, data: json },
        { status: 500 }
      );
    }

    const d = json.data;
    console.log(
      `[cron] ✓ slot=${runSlot} departments=[${focusDepartments}] | ` +
      `${d?.new_jobs} new | ${d?.updated} updated | ` +
      `${d?.stale_deactivated} deactivated | ` +
      `${d?.companies_succeeded}/${d?.companies_attempted} companies | ${d?.duration_ms}ms`
    );

    return NextResponse.json({
      success: true,
      started_at: startedAt,
      message: 'Job fetch complete',
      run_slot: runSlot,
      focus_departments: focusDepartments,
      data: json.data,
    });
  } catch (err: any) {
    console.error('[cron] Fatal error:', err.message);
    return NextResponse.json(
      { success: false, error: 'Cron fetch failed', detail: err.message },
      { status: 500 }
    );
  }
}