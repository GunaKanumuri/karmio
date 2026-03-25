// Sliding window counter implementation
// Stored in Supabase rate_limit_log table
// Each check is a single SQL query — no Redis needed

import { RATE_LIMITS } from '@/lib/constants';
import { SubscriptionTier } from '@/types';

export type RateLimitAction =
  | 'browse' | 'ai_resume' | 'ai_message' | 'ai_cover'
  | 'ai_prep' | 'apply' | 'profile' | 'download' | 'auth';

export function getRateLimitConfig(tier: SubscriptionTier, action: RateLimitAction): {
  limit: number;
  windowMs: number;
} {
  const tierLimits = RATE_LIMITS[tier];
  const limit = tierLimits[action as keyof typeof tierLimits] as number;

  let windowMs: number;
  if (action === 'browse') windowMs = tierLimits.window_browse;
  else if (action === 'auth') windowMs = tierLimits.window_auth;
  else windowMs = tierLimits.window_ai;

  return { limit, windowMs };
}

export function formatRateLimitError(action: string, resetAt: Date): string {
  const minutes = Math.ceil((resetAt.getTime() - Date.now()) / 60000);
  if (minutes <= 1) return 'Too many requests. Please wait a moment and try again.';
  if (minutes < 60) return `Too many requests. Please wait ${minutes} minutes before trying again.`;
  const hours = Math.ceil(minutes / 60);
  return `Rate limit reached. Resets in ${hours} hour${hours > 1 ? 's' : ''}.`;
}
