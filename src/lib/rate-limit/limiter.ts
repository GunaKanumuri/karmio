import { createAdminClient } from '@/lib/supabase/admin';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset_at: Date;
  limit: number;
}

export async function checkRateLimit(
  userId: string,
  action: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const supabase = createAdminClient();
  const windowStart = new Date(Date.now() - windowMs);

  const { count } = await supabase
    .from('rate_limit_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', action)
    .gte('created_at', windowStart.toISOString());

  const currentCount = count ?? 0;
  const remaining = Math.max(0, limit - currentCount);
  const resetAt = new Date(Date.now() + windowMs);

  return {
    allowed: currentCount < limit,
    remaining,
    reset_at: resetAt,
    limit,
  };
}

export async function logRateLimitAction(userId: string, action: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from('rate_limit_log').insert({ user_id: userId, action });
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.reset_at.getTime() / 1000)),
  };
}
