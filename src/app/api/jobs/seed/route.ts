import { NextRequest, NextResponse } from 'next/server';

// Seed endpoint — calls the job fetcher internally to populate initial data.
// Call via: POST /api/jobs/seed (with CRON_SECRET or service role key)
// This is a convenience wrapper around /api/jobs/fetch.

export async function POST(req: NextRequest) {
  const origin = req.nextUrl.origin;

  // Forward auth
  const authHeader = req.headers.get('authorization') || '';
  const body = await req.json().catch(() => ({}));

  try {
    const res = await fetch(`${origin}/api/jobs/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({ secret: body.secret }),
    });

    const json = await res.json();

    return NextResponse.json({
      success: json.success,
      message: json.success
        ? `Seed complete! Fetched ${json.data?.fetched || 0} jobs, ${json.data?.new_jobs || 0} new, ${json.data?.updated || 0} updated.`
        : 'Seed failed — check /api/jobs/fetch logs.',
      data: json.data,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: { code: 'SEED_FAILED', message: 'Could not run seed. Is the fetch endpoint accessible?' },
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'POST to this endpoint with your CRON_SECRET to seed the database with jobs from Greenhouse and Lever.',
    example: 'curl -X POST /api/jobs/seed -H "Content-Type: application/json" -d \'{"secret":"your-cron-secret"}\'',
  });
}
