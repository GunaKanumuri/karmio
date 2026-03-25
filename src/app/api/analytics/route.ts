import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { checkTierAccess } from '@/lib/payments/tier-gate';
import { SubscriptionTier } from '@/types';

// GET /api/analytics?type=overview|weekly|funnel|insights
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } },
        { status: 401 }
      );
    }

    // Fetch user profile for tier
    const { data: profile } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const tier = (profile?.subscription_tier || 'free') as SubscriptionTier;
    const type = req.nextUrl.searchParams.get('type') || 'overview';

    // Tier gate for insights (Pro only)
    if (type === 'insights') {
      const gate = checkTierAccess(tier, 'advanced_analytics');
      if (!gate.allowed) {
        return NextResponse.json({
          success: false,
          error: { code: 'TIER_LIMIT_REACHED', message: gate.reason, upgrade_message: gate.upgrade_message },
        }, { status: 403 });
      }
    }

    // Fetch all non-saved applications for this user
    const { data: applications, error } = await supabase
      .from('applications')
      .select('id, status, applied_at, match_score, created_at, notes, rejection_reason, job_id')
      .eq('user_id', user.id)
      .neq('status', 'saved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET /api/analytics] query error:', error);
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message: 'Could not fetch analytics.' } },
        { status: 500 }
      );
    }

    const apps = applications || [];

    switch (type) {
      case 'overview':
        return buildOverview(apps);
      case 'weekly':
        return buildWeekly(apps);
      case 'funnel':
        return buildFunnel(apps);
      case 'insights':
        return buildInsights(apps);
      default:
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_TYPE', message: 'Unknown analytics type. Use: overview, weekly, funnel, insights.' } },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error('[GET /api/analytics]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.', retryable: true } },
      { status: 500 }
    );
  }
}

// ─── Overview (all tiers) ───
function buildOverview(apps: any[]) {
  const total = apps.length;
  const CALLBACK_STATUSES = ['hr_screen', 'technical', 'behavioral', 'final', 'offer'];
  const callbacks = apps.filter(a => CALLBACK_STATUSES.includes(a.status)).length;
  const callbackRate = total > 0 ? Math.round((callbacks / total) * 100) : 0;
  const offers = apps.filter(a => a.status === 'offer').length;
  const rejected = apps.filter(a => a.status === 'rejected').length;
  const noResponse = apps.filter(a => a.status === 'no_response').length;
  const avgMatchScore = total > 0
    ? Math.round(apps.reduce((sum, a) => sum + (a.match_score || 0), 0) / total)
    : 0;

  const res = NextResponse.json({
    success: true,
    data: { total_applied: total, callbacks, callback_rate: callbackRate, offers, rejected, no_response: noResponse, avg_match_score: avgMatchScore },
    meta: { cached: false },
  });
  res.headers.set('Cache-Control', 'private, s-maxage=300, stale-while-revalidate=600');
  return res;
}

// ─── Weekly (Popular+) ───
function buildWeekly(apps: any[]) {
  const weeks = [];
  const CALLBACK_STATUSES = ['hr_screen', 'technical', 'behavioral', 'final', 'offer'];

  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (i * 7 + weekStart.getDay()));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekApps = apps.filter(a => {
      const d = new Date(a.applied_at || a.created_at);
      return d >= weekStart && d < weekEnd;
    });
    const callbacks = weekApps.filter(a => CALLBACK_STATUSES.includes(a.status)).length;

    weeks.push({
      week_start: weekStart.toISOString().slice(0, 10),
      label: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      applied: weekApps.length,
      callbacks,
      callback_rate: weekApps.length > 0 ? Math.round((callbacks / weekApps.length) * 100) : 0,
    });
  }

  const res = NextResponse.json({ success: true, data: { weeks } });
  res.headers.set('Cache-Control', 'private, s-maxage=900, stale-while-revalidate=1800');
  return res;
}

// ─── Funnel (Pro) ───
function buildFunnel(apps: any[]) {
  const STAGES = ['applied', 'hr_screen', 'technical', 'behavioral', 'final', 'offer', 'rejected', 'no_response'];

  const funnel = STAGES.map(stage => ({
    stage,
    count: apps.filter(a => a.status === stage).length,
  }));

  // Conversion rates between progressive stages
  const ORDERED = ['applied', 'hr_screen', 'technical', 'behavioral', 'final', 'offer'];
  const conversions = [];
  for (let i = 0; i < ORDERED.length - 1; i++) {
    const from = funnel.find(f => f.stage === ORDERED[i])?.count || 0;
    const to = funnel.find(f => f.stage === ORDERED[i + 1])?.count || 0;
    conversions.push({
      from: ORDERED[i],
      to: ORDERED[i + 1],
      rate: from > 0 ? Math.round((to / from) * 100) : 0,
    });
  }

  return NextResponse.json({
    success: true,
    data: { funnel, conversions, total: apps.length },
  });
}

// ─── Insights (Pro) ───
function buildInsights(apps: any[]) {
  const insights: { type: 'tip' | 'warning' | 'success'; message: string }[] = [];
  const total = apps.length;

  if (total < 5) {
    insights.push({
      type: 'tip',
      message: 'Apply to more jobs to unlock personalized insights. We need at least 5 applications to analyze patterns.',
    });
    return NextResponse.json({ success: true, data: { insights } });
  }

  const CALLBACK_STATUSES = ['hr_screen', 'technical', 'behavioral', 'final', 'offer'];
  const callbacks = apps.filter(a => CALLBACK_STATUSES.includes(a.status)).length;
  const callbackRate = Math.round((callbacks / total) * 100);
  const noResponse = apps.filter(a => a.status === 'no_response').length;
  const offers = apps.filter(a => a.status === 'offer').length;
  const avgMatchScore = Math.round(apps.reduce((sum, a) => sum + (a.match_score || 0), 0) / total);

  // Callback rate analysis
  if (callbackRate < 10) {
    insights.push({
      type: 'warning',
      message: `Your callback rate is ${callbackRate}%, below the typical 15-20% range. Consider tailoring your resume more closely to each JD and applying to jobs with higher match scores.`,
    });
  } else if (callbackRate >= 25) {
    insights.push({
      type: 'success',
      message: `Your callback rate of ${callbackRate}% is excellent — well above average. Your resume strategy is working.`,
    });
  }

  // No response rate
  if (noResponse > total * 0.6) {
    insights.push({
      type: 'warning',
      message: `${Math.round((noResponse / total) * 100)}% of your applications got no response. Try following up 7 days after applying, and prioritize jobs with higher realness scores.`,
    });
  }

  // Match score quality
  if (avgMatchScore < 50) {
    insights.push({
      type: 'tip',
      message: `Your average match score is ${avgMatchScore}%. Applying to jobs with 60%+ match typically doubles callback rates. Consider adjusting your target profile.`,
    });
  }

  // Offers
  if (offers > 0) {
    insights.push({
      type: 'success',
      message: `You have ${offers} offer${offers > 1 ? 's' : ''}. Use salary intelligence (Pro) to research compensation ranges before negotiating.`,
    });
  }

  // Stage drop-off: getting HR screens but not technicals
  const hrScreens = apps.filter(a => CALLBACK_STATUSES.includes(a.status)).length;
  const technicals = apps.filter(a => ['technical', 'behavioral', 'final', 'offer'].includes(a.status)).length;
  if (hrScreens > 3 && technicals === 0) {
    insights.push({
      type: 'warning',
      message: 'You are getting HR screens but not progressing to technical rounds. This often means a gap between your resume and interview presence. Practice your "tell me about yourself" pitch.',
    });
  }

  return NextResponse.json({ success: true, data: { insights } });
}