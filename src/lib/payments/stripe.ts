import Stripe from 'stripe';
import { PRICING } from '@/lib/constants';
import { Country } from '@/types';

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any });
  }
  return stripeInstance;
}

export async function createCustomer(email: string, name?: string): Promise<string> {
  const stripe = getStripe();
  const customer = await stripe.customers.create({ email, name: name || undefined });
  return customer.id;
}

export async function createCheckoutSession(
  customerId: string,
  plan: 'popular' | 'pro',
  billing: 'monthly' | 'yearly',
  country: Country,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const stripe = getStripe();
  const pricing = PRICING[country][plan];
  const amount = billing === 'yearly' ? pricing.yearly_total : pricing.monthly;
  const interval = billing === 'yearly' ? 'year' : 'month';
  const currency = country === 'IN' ? 'inr' : 'usd';

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency,
        product_data: { name: `Karmio ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan` },
        unit_amount: Math.round(amount * 100),
        recurring: { interval: interval as 'month' | 'year' },
      },
      quantity: 1,
    }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { plan, billing, country },
  });

  return session.url!;
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const stripe = getStripe();
  await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
}

export async function verifyWebhookSignature(payload: string, signature: string): Promise<Stripe.Event> {
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!);
}

export async function getSubscriptionDetails(customerId: string): Promise<{
  active: boolean;
  plan: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
} | null> {
  const stripe = getStripe();
  const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: 'active', limit: 1 });

  if (subscriptions.data.length === 0) {
    return { active: false, plan: null, current_period_end: null, cancel_at_period_end: false };
  }

  const sub = subscriptions.data[0];
  return {
    active: true,
    plan: sub.metadata.plan || null,
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    cancel_at_period_end: sub.cancel_at_period_end,
  };
}
