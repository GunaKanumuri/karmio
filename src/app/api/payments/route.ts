import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createCustomer, createCheckoutSession, cancelSubscription, verifyWebhookSignature, getSubscriptionDetails } from '@/lib/payments/stripe';
import { Country } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } }, { status: 401 });

    const { data: profile } = await supabase.from('users')
      .select('subscription_tier, stripe_customer_id, country')
      .eq('id', user.id).single();

    if (!profile) return NextResponse.json({ success: false, error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found.' } }, { status: 404 });

    const { data: usage } = await supabase.rpc('get_weekly_usage', { p_user_id: user.id });

    let stripeDetails = null;
    if (profile.stripe_customer_id) {
      stripeDetails = await getSubscriptionDetails(profile.stripe_customer_id).catch(() => null);
    }

    return NextResponse.json({
      success: true,
      data: {
        tier: profile.subscription_tier,
        country: profile.country,
        stripe: stripeDetails,
        usage: {
          applications_this_week: usage?.applications_count || 0,
          resumes_this_week: usage?.resumes_generated || 0,
          messages_this_week: usage?.messages_generated || 0,
          cover_letters_this_week: usage?.cover_letters_generated || 0,
        },
      },
    }, { headers: { 'Cache-Control': 'private, max-age=900' } });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // Stripe webhook
    if (req.nextUrl.searchParams.get('webhook') === 'true') {
      const body = await req.text();
      const signature = req.headers.get('stripe-signature');
      if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 401 });

      let event;
      try {
        event = await verifyWebhookSignature(body, signature);
      } catch {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }

      const adminSupabase = createAdminClient();

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as any;
          const plan = session.metadata?.plan || 'popular';
          const customerId = session.customer as string;

          await adminSupabase.from('users')
            .update({ subscription_tier: plan, stripe_customer_id: customerId })
            .eq('stripe_customer_id', customerId);
          break;
        }
        case 'customer.subscription.deleted': {
          const sub = event.data.object as any;
          const customerId = sub.customer as string;

          await adminSupabase.from('users')
            .update({ subscription_tier: 'free' })
            .eq('stripe_customer_id', customerId);
          break;
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object as any;
          const customerId = invoice.customer as string;
          // Could send email notification here via Resend
          console.warn(`Payment failed for customer ${customerId}`);
          break;
        }
      }

      return NextResponse.json({ received: true });
    }

    // Create checkout session
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } }, { status: 401 });

    const body = await req.json();
    const { plan, billing = 'yearly' } = body;

    if (!plan || !['popular', 'pro'].includes(plan)) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid plan. Choose popular or pro.' } }, { status: 400 });
    }

    const { data: profile } = await supabase.from('users')
      .select('email, full_name, stripe_customer_id, country')
      .eq('id', user.id).single();

    if (!profile) return NextResponse.json({ success: false, error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found.' } }, { status: 404 });

    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      customerId = await createCustomer(profile.email, profile.full_name || undefined);
      await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const checkoutUrl = await createCheckoutSession(
      customerId,
      plan as 'popular' | 'pro',
      billing as 'monthly' | 'yearly',
      (profile.country || 'US') as Country,
      `${appUrl}/dashboard/subscription?success=true`,
      `${appUrl}/dashboard/subscription?cancelled=true`
    );

    return NextResponse.json({ success: true, data: { checkout_url: checkoutUrl } });
  } catch (err) {
    console.error('Payment error:', err);
    return NextResponse.json({ success: false, error: { code: 'STRIPE_PAYMENT_FAILED', message: 'Payment could not be processed.', action: 'Try another card or contact support.', retryable: true } }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Please sign in.' } }, { status: 401 });

    const { data: profile } = await supabase.from('users')
      .select('stripe_customer_id')
      .eq('id', user.id).single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ success: false, error: { code: 'NO_SUBSCRIPTION', message: 'No active subscription to cancel.' } }, { status: 400 });
    }

    const details = await getSubscriptionDetails(profile.stripe_customer_id);
    if (!details?.active) {
      return NextResponse.json({ success: false, error: { code: 'NO_SUBSCRIPTION', message: 'No active subscription to cancel.' } }, { status: 400 });
    }

    // We need the subscription ID — get it from Stripe
    const stripe = (await import('stripe')).default;
    const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any });
    const subs = await stripeClient.subscriptions.list({ customer: profile.stripe_customer_id, status: 'active', limit: 1 });

    if (subs.data.length > 0) {
      await cancelSubscription(subs.data[0].id);
    }

    return NextResponse.json({ success: true, data: { cancelled: true, effective_end: details.current_period_end } });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Could not cancel subscription. Please contact support.' } }, { status: 500 });
  }
}
