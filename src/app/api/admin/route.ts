import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Middleware: check admin role
async function requireAdmin(req: NextRequest): Promise<{ userId: string } | NextResponse> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } }, { status: 401 });

  // Check admin role — in production, add a 'role' column to users table
  // For now, check against env variable for admin emails
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
  const { data: profile } = await supabase.from('users').select('email').eq('id', user.id).single();

  if (!profile || !adminEmails.includes(profile.email.toLowerCase())) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } }, { status: 403 });
  }

  return { userId: user.id };
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAdmin(req);
    if (authResult instanceof NextResponse) return authResult;

    const section = req.nextUrl.searchParams.get('section') || 'overview';
    const adminDb = createAdminClient();

    if (section === 'overview') {
      const [usersRes, jobsRes, appsRes, activeJobsRes] = await Promise.all([
        adminDb.from('users').select('id', { count: 'exact', head: true }),
        adminDb.from('job_postings').select('id', { count: 'exact', head: true }),
        adminDb.from('applications').select('id', { count: 'exact', head: true }),
        adminDb.from('job_postings').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);

      // Tier breakdown
      const [freeRes, popRes, proRes] = await Promise.all([
        adminDb.from('users').select('id', { count: 'exact', head: true }).eq('subscription_tier', 'free'),
        adminDb.from('users').select('id', { count: 'exact', head: true }).eq('subscription_tier', 'popular'),
        adminDb.from('users').select('id', { count: 'exact', head: true }).eq('subscription_tier', 'pro'),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          total_users: usersRes.count || 0,
          total_jobs: jobsRes.count || 0,
          active_jobs: activeJobsRes.count || 0,
          total_applications: appsRes.count || 0,
          tiers: {
            free: freeRes.count || 0,
            popular: popRes.count || 0,
            pro: proRes.count || 0,
          },
        },
      });
    }

    if (section === 'users') {
      const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
      const limit = 50;
      const offset = (page - 1) * limit;

      const { data: users, count } = await adminDb.from('users')
        .select('id, email, full_name, country, subscription_tier, onboarding_complete, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      return NextResponse.json({ success: true, data: users || [], meta: { page, total: count, limit } });
    }

    if (section === 'jobs') {
      const { data: jobStats } = await adminDb.from('job_postings')
        .select('source_type, is_active')
        .limit(10000);

      const sourceBreakdown: Record<string, number> = {};
      let activeCount = 0;
      let inactiveCount = 0;

      (jobStats || []).forEach(j => {
        sourceBreakdown[j.source_type] = (sourceBreakdown[j.source_type] || 0) + 1;
        if (j.is_active) activeCount++; else inactiveCount++;
      });

      return NextResponse.json({
        success: true,
        data: { active: activeCount, inactive: inactiveCount, by_source: sourceBreakdown },
      });
    }

    if (section === 'health') {
      // System health check
      const startTime = Date.now();
      const { error: dbCheck } = await adminDb.from('users').select('id').limit(1);
      const dbLatency = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        data: {
          status: dbCheck ? 'degraded' : 'healthy',
          database: { latency_ms: dbLatency, connected: !dbCheck },
          timestamp: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({ success: false, error: { code: 'INVALID_SECTION', message: 'Valid sections: overview, users, jobs, health' } }, { status: 400 });
  } catch (err) {
    console.error('Admin API error:', err);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } }, { status: 500 });
  }
}
