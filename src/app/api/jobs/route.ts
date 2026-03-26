import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/rate-limit/middleware';
import { SubscriptionTier } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } }, { status: 401 });
    }

    // Rate limit: browse
    const { data: profile } = await supabase.from('users').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier || 'free') as SubscriptionTier;
    const blocked = await applyRateLimit(user.id, tier, 'browse');
    if (blocked) return blocked;

    const url = req.nextUrl.searchParams;
    const search = url.get('search') || '';
    const location = url.get('location') || '';
    const remoteType = url.getAll('remote_type');
    const sponsorship = url.getAll('sponsorship');
    const postedWithin = url.get('posted_within') || '7d';
    const sortBy = url.get('sort_by') || 'date';
    const cursor = url.get('cursor');
    const limit = Math.min(parseInt(url.get('limit') || '30'), 50);

    // Get user country for filtering
    const { data: userProfile } = await supabase
      .from('users').select('country').eq('id', user.id).single();

    let query = supabase
      .from('job_postings')
      .select('*, job_sources(*)', { count: 'exact' })
      .eq('is_active', true)
      .eq('country', userProfile?.country || 'US')
      .limit(limit);

    // Search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,company_name.ilike.%${search}%`);
    }

    // Location filter
    if (location) {
      query = query.ilike('location', `%${location}%`);
    }

    // Remote type filter
    if (remoteType.length > 0) {
      query = query.in('remote_type', remoteType);
    }

    // Sponsorship filter
    if (sponsorship.length > 0) {
      query = query.in('sponsorship_status', sponsorship);
    }

    // Posted within filter
    const timeMap: Record<string, number> = {
      '1h': 3600000, '2h': 7200000, '4h': 14400000, '1d': 86400000,
      '2d': 172800000, '7d': 604800000,
    };
    if (postedWithin in timeMap) {
      const since = new Date(Date.now() - timeMap[postedWithin]).toISOString();
      query = query.gte('first_seen_at', since);
    }

    // Cursor-based pagination
    if (cursor) {
      query = query.lt('first_seen_at', cursor);
    }

    // Sort
    if (sortBy === 'date') {
      query = query.order('first_seen_at', { ascending: false });
    } else if (sortBy === 'realness') {
      query = query.order('realness_score', { ascending: false });
    }

    const { data: jobs, error, count } = await query;

    if (error) {
      return NextResponse.json({
        success: false,
        error: { code: 'QUERY_FAILED', message: 'Could not load jobs. Please try again.', retryable: true }
      }, { status: 500 });
    }

    const nextCursor = jobs && jobs.length === limit
      ? jobs[jobs.length - 1].first_seen_at : null;

    return NextResponse.json({
      success: true,
      data: jobs || [],
      meta: { total: count, cursor: nextCursor, cached: false },
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      }
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.', retryable: true }
    }, { status: 500 });
  }
}