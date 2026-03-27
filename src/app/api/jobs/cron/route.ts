import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/jobs/cron — Vercel Cron handler
 * 1. Fetch new jobs via POST /api/jobs/fetch
 * 2. Recompute match scores via POST /api/match
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const hour = new Date().getUTCHours();
  const runSlot = Math.floor(hour / 2);

  const DEPARTMENT_ROTATION: Record<number, string[]> = {
    0: ['engineering', 'data'], 1: ['design', 'product'],
    2: ['finance', 'accounting'], 3: ['marketing', 'sales'],
    4: ['hr', 'operations'], 5: ['engineering', 'devops'],
    6: ['product', 'management'], 7: ['design', 'creative'],
    8: ['finance', 'legal'], 9: ['engineering', 'security'],
    10: ['marketing', 'growth'], 11: ['data', 'ml'],
  };

  const focusDepartments = DEPARTMENT_ROTATION[runSlot] || ['engineering'];

  try {
    const origin = req.nextUrl.origin;

    // Step 1: Fetch jobs
    const fetchRes = await fetch(`${origin}/api/jobs/fetch`, {
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

    const fetchJson = await fetchRes.json();

    if (!fetchJson.success) {
      console.error('[cron] Fetch failed:', JSON.stringify(fetchJson));
      return NextResponse.json(
        { success: false, started_at: startedAt, phase: 'fetch', data: fetchJson },
        { status: 500 }
      );
    }

    const d = fetchJson.data;
    console.log(
      `[cron] ✓ FETCH slot=${runSlot} depts=[${focusDepartments}] | ` +
      `${d?.new_jobs} new | ${d?.updated} updated | ` +
      `${d?.stale_deactivated} deactivated | ` +
      `${d?.companies_succeeded}/${d?.companies_attempted} companies | ${d?.duration_ms}ms`
    );

    // Step 2: Recompute match scores
    let matchResult = null;
    try {
      const matchRes = await fetch(`${origin}/api/match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cronSecret || ''}`,
        },
        body: JSON.stringify({ mode: 'batch', secret: cronSecret }),
      });
      const matchJson = await matchRes.json();
      matchResult = matchJson.data;
      if (matchJson.success) {
        console.log(
          `[cron] ✓ MATCH users=${matchResult?.users_processed} scores=${matchResult?.total_computed} ${matchResult?.duration_ms}ms`
        );
      }
    } catch (matchErr: any) {
      console.warn('[cron] Match failed (non-fatal):', matchErr.message);
    }

    return NextResponse.json({
      success: true, started_at: startedAt,
      message: 'Job fetch + match computation complete',
      run_slot: runSlot, focus_departments: focusDepartments,
      fetch: fetchJson.data, match: matchResult,
    });
  } catch (err: any) {
    console.error('[cron] Fatal error:', err.message);
    return NextResponse.json(
      { success: false, error: 'Cron failed', detail: err.message },
      { status: 500 }
    );
  }
}