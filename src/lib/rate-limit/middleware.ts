import { NextResponse } from 'next/server';
import { checkRateLimit, logRateLimitAction, rateLimitHeaders } from '@/lib/rate-limit/limiter';
import { getRateLimitConfig, RateLimitAction, formatRateLimitError } from '@/lib/rate-limit/sliding-window';
import { SubscriptionTier } from '@/types';

/**
 * Apply rate limiting to an API request.
 * Returns null if allowed, or a 429 NextResponse if rate limited.
 *
 * Usage in API route:
 *   const blocked = await applyRateLimit(userId, tier, 'ai_resume');
 *   if (blocked) return blocked;
 */
export async function applyRateLimit(
  userId: string,
  tier: SubscriptionTier,
  action: RateLimitAction
): Promise<NextResponse | null> {
  try {
    const config = getRateLimitConfig(tier, action);

    // If limit is 0, the feature is blocked for this tier
    if (config.limit === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FEATURE_NOT_AVAILABLE',
          message: 'This feature is not available on your current plan.',
          action: 'Upgrade to unlock this feature.',
        },
      }, { status: 403 });
    }

    const result = await checkRateLimit(userId, action, config.limit, config.windowMs);

    if (!result.allowed) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: formatRateLimitError(action, result.reset_at),
          retryable: true,
        },
      }, {
        status: 429,
        headers: rateLimitHeaders(result),
      });
    }

    // Log the action for the sliding window counter
    await logRateLimitAction(userId, action);

    return null; // Allowed — proceed with request
  } catch (err) {
    // If rate limit infrastructure fails (table doesn't exist, etc.), allow the request
    // Better to allow some extra requests than to block legitimate users
    console.error('Rate limit check failed (allowing request):', err);
    return null;
  }
}
