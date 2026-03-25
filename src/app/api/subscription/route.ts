import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSubscriptionDetails } from '@/lib/payments/stripe';

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

    // Get user's Stripe customer ID and current tier
    const { data: profile } = await supabase
      .from('users')
      .select('stripe_customer_id, subscription_tier')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_SUBSCRIPTION', message: 'No active subscription found.' } },
        { status: 400 }
      );
    }

    if (profile.subscription_tier === 'free') {
      return NextResponse.json(
        { success: false, error: { code: 'ALREADY_FREE', message: 'You are already on the Free plan.' } },
        { status: 400 }
      );
    }

    // Check Stripe for active subscription
    const sub = await getSubscriptionDetails(profile.stripe_customer_id);

    if (!sub?.active) {
      // No active sub in Stripe — just downgrade in DB
      await supabase
        .from('users')
        .update({ subscription_tier: 'free', updated_at: new Date().toISOString() })
        .eq('id', user.id);

      return NextResponse.json({
        success: true,
        data: { message: 'Your plan has been downgraded to Free.' },
      });
    }

    // Cancel at period end so user keeps access until billing period ends
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any });
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      await stripe.subscriptions.update(subscriptions.data[0].id, {
        cancel_at_period_end: true,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Your subscription will be cancelled at the end of the current billing period.',
        cancel_at: sub.current_period_end,
      },
    });
  } catch (err) {
    console.error('[POST /api/subscription/cancel]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Could not cancel subscription. Please try again or contact support.', retryable: true } },
      { status: 500 }
    );
  }
}