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

    // Fetch all non-saved applications
    const { data: applications, error } = await supabase
      .from('applications')
      .select('id, status, applied_at, match_score, created_at, notes, rejection_reason, job_id, stage_entered_at')
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

    // Fetch outreach data for outreach effectiveness
    let outreachData: any[] = [];
    try {
      const { data } = await supabase
        .from('outreach_suggestions')
        .select('id, application_id, outreach_status, sent_at, response_at')
        .eq('user_id', user.id);
      outreachData = data || [];
    } catch {}

    // Fetch follow-ups for activity tracking
    let followUps: any[] = [];
    try {
      const { data } = await supabase
        .from('follow_ups')
        .select('id, application_id, due_date, is_completed')
        .eq('user_id', user.id);
      followUps = data || [];
    } catch {}

    switch (type) {
      case 'overview':
        return buildOverview(apps, outreachData, followUps);
      case 'weekly':
        return buildWeekly(apps);
      case 'funnel':
        return buildFunnel(apps);
      case 'insights':
        return buildInsights(apps, outreachData);
      default:
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_TYPE', message: 'Use: overview, weekly, funnel, insights.' } },
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
function buildOverview(apps: any[], outreach: any[], followUps: any[]) {
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

  // This week's applications
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const thisWeekApps = apps.filter(a => new Date(a.applied_at || a.created_at) >= weekStart).length;

  // Days since last application
  const lastApp = apps[0];
  const daysSinceLastApp = lastApp
    ? Math.floor((Date.now() - new Date(lastApp.applied_at || lastApp.created_at).getTime()) / 86400000)
    : -1;

  // Outreach stats
  const outreachSent = outreach.filter(o => ['sent', 'followed_up', 'responded', 'interview_scheduled'].includes(o.outreach_status)).length;
  const outreachResponded = outreach.filter(o => ['responded', 'interview_scheduled'].includes(o.outreach_status)).length;
  const outreachResponseRate = outreachSent > 0 ? Math.round((outreachResponded / outreachSent) * 100) : 0;

  // Outreach correlation: callback rate WITH outreach vs WITHOUT
  const appsWithOutreach = new Set(outreach.filter(o => o.outreach_status !== 'pending').map(o => o.application_id));
  const appsWithOutreachCallbacks = apps.filter(a => appsWithOutreach.has(a.id) && CALLBACK_STATUSES.includes(a.status)).length;
  const appsWithoutOutreachCallbacks = apps.filter(a => !appsWithOutreach.has(a.id) && CALLBACK_STATUSES.includes(a.status)).length;
  const appsWithOutreachTotal = apps.filter(a => appsWithOutreach.has(a.id)).length;
  const appsWithoutOutreachTotal = apps.filter(a => !appsWithOutreach.has(a.id)).length;

  // Follow-up stats
  const pendingFollowUps = followUps.filter(f => !f.is_completed && new Date(f.due_date) <= new Date()).length;
  const upcomingFollowUps = followUps.filter(f => !f.is_completed && new Date(f.due_date) > new Date()).length;

  // Mini velocity: last 4 weeks
  const velocity: number[] = [];
  for (let i = 3; i >= 0; i--) {
    const wStart = new Date();
    wStart.setDate(wStart.getDate() - ((i + 1) * 7));
    wStart.setHours(0, 0, 0, 0);
    const wEnd = new Date(wStart);
    wEnd.setDate(wEnd.getDate() + 7);
    velocity.push(apps.filter(a => {
      const d = new Date(a.applied_at || a.created_at);
      return d >= wStart && d < wEnd;
    }).length);
  }

  const res = NextResponse.json({
    success: true,
    data: {
      total_applied: total,
      callbacks,
      callback_rate: callbackRate,
      offers,
      rejected,
      no_response: noResponse,
      avg_match_score: avgMatchScore,
      this_week_apps: thisWeekApps,
      days_since_last_app: daysSinceLastApp,
      velocity,
      outreach: {
        sent: outreachSent,
        responded: outreachResponded,
        response_rate: outreachResponseRate,
        with_outreach_callbacks: appsWithOutreachCallbacks,
        with_outreach_total: appsWithOutreachTotal,
        without_outreach_callbacks: appsWithoutOutreachCallbacks,
        without_outreach_total: appsWithoutOutreachTotal,
      },
      follow_ups: {
        overdue: pendingFollowUps,
        upcoming: upcomingFollowUps,
      },
    },
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

// ─── Funnel (basic for all, conversion rates Pro) ───
function buildFunnel(apps: any[]) {
  const STAGES = ['applied', 'hr_screen', 'technical', 'behavioral', 'final', 'offer', 'rejected', 'no_response'];

  const funnel = STAGES.map(stage => ({
    stage,
    count: apps.filter(a => a.status === stage).length,
  }));

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

  // Average days in each stage
  const stageDurations: Record<string, number[]> = {};
  apps.forEach(a => {
    if (a.stage_entered_at && a.applied_at) {
      const days = Math.floor((new Date(a.stage_entered_at).getTime() - new Date(a.applied_at).getTime()) / 86400000);
      if (!stageDurations[a.status]) stageDurations[a.status] = [];
      stageDurations[a.status].push(Math.max(0, days));
    }
  });

  const avgDays: Record<string, number> = {};
  Object.entries(stageDurations).forEach(([stage, days]) => {
    avgDays[stage] = days.length > 0 ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : 0;
  });

  return NextResponse.json({
    success: true,
    data: { funnel, conversions, total: apps.length, avg_days_per_stage: avgDays },
  });
}

// ─── Insights (Pro) ───
function buildInsights(apps: any[], outreach: any[]) {
  const insights: { type: 'tip' | 'warning' | 'success'; title: string; message: string }[] = [];
  const total = apps.length;

  if (total < 5) {
    insights.push({
      type: 'tip',
      title: 'Keep going',
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
      title: 'Low callback rate',
      message: `Your callback rate is ${callbackRate}%, below the typical 15-20% range. Consider tailoring your resume more closely to each JD and applying to jobs with higher match scores.`,
    });
  } else if (callbackRate >= 25) {
    insights.push({
      type: 'success',
      title: 'Strong callback rate',
      message: `Your callback rate of ${callbackRate}% is excellent — well above average. Your resume strategy is working.`,
    });
  }

  // No response rate
  if (noResponse > total * 0.6) {
    insights.push({
      type: 'warning',
      title: 'High ghost rate',
      message: `${Math.round((noResponse / total) * 100)}% of your applications got no response. Try following up 7 days after applying, and prioritize jobs with higher realness scores.`,
    });
  }

  // Match score quality
  if (avgMatchScore > 0 && avgMatchScore < 50) {
    insights.push({
      type: 'tip',
      title: 'Match quality',
      message: `Your average match score is ${avgMatchScore}%. Applying to jobs with 60%+ match typically doubles callback rates. Consider adjusting your target profile.`,
    });
  } else if (avgMatchScore >= 70 && callbackRate < 15) {
    insights.push({
      type: 'warning',
      title: 'Resume may need work',
      message: `Your match score is high (${avgMatchScore}%) but callbacks are low (${callbackRate}%). This suggests your resume may not be conveying your qualifications effectively. Try AI tailoring for each application.`,
    });
  }

  // Offers
  if (offers > 0) {
    insights.push({
      type: 'success',
      title: 'Offer received',
      message: `You have ${offers} offer${offers > 1 ? 's' : ''}. Research compensation ranges before negotiating — candidates who negotiate earn 10-20% more on average.`,
    });
  }

  // Stage drop-off
  const hrScreens = apps.filter(a => CALLBACK_STATUSES.includes(a.status)).length;
  const technicals = apps.filter(a => ['technical', 'behavioral', 'final', 'offer'].includes(a.status)).length;
  if (hrScreens > 3 && technicals === 0) {
    insights.push({
      type: 'warning',
      title: 'HR screen bottleneck',
      message: 'You are getting HR screens but not progressing to technical rounds. This often means a gap between your resume and interview presence. Practice your elevator pitch and prepare concrete examples.',
    });
  }

  // Outreach correlation
  const appsWithOutreach = new Set(outreach.filter(o => o.outreach_status !== 'pending').map(o => o.application_id));
  const withOutreachCallbacks = apps.filter(a => appsWithOutreach.has(a.id) && CALLBACK_STATUSES.includes(a.status)).length;
  const withOutreachTotal = apps.filter(a => appsWithOutreach.has(a.id)).length;
  const withoutOutreachCallbacks = apps.filter(a => !appsWithOutreach.has(a.id) && CALLBACK_STATUSES.includes(a.status)).length;
  const withoutOutreachTotal = apps.filter(a => !appsWithOutreach.has(a.id)).length;

  if (withOutreachTotal >= 2 && withoutOutreachTotal >= 2) {
    const withRate = Math.round((withOutreachCallbacks / withOutreachTotal) * 100);
    const withoutRate = Math.round((withoutOutreachCallbacks / withoutOutreachTotal) * 100);
    if (withRate > withoutRate + 10) {
      insights.push({
        type: 'success',
        title: 'Networking pays off',
        message: `You got callbacks on ${withRate}% of jobs where you did outreach vs ${withoutRate}% where you didn't. Keep networking — it's working.`,
      });
    } else if (withRate <= withoutRate && withOutreachTotal > 0) {
      insights.push({
        type: 'tip',
        title: 'Refine your outreach',
        message: `Your outreach hasn't improved callbacks yet (${withRate}% with vs ${withoutRate}% without). Try reaching out to hiring managers instead of recruiters, or personalize your messages more.`,
      });
    }
  }

  return NextResponse.json({ success: true, data: { insights } });
}