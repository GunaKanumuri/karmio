// Cache invalidation rules
// Since we use Vercel edge cache + React Query (not Redis),
// invalidation is handled by:
// 1. Vercel: s-maxage and stale-while-revalidate headers
// 2. React Query: queryClient.invalidateQueries()
// 3. Supabase real-time: triggers re-fetch on data changes

export type InvalidationEvent =
  | 'profile_updated'
  | 'application_created'
  | 'application_status_changed'
  | 'resume_generated'
  | 'subscription_changed'
  | 'new_jobs_fetched'
  | 'follow_up_completed';

export function getCacheKeysToInvalidate(event: InvalidationEvent, userId: string): string[] {
  const keys: string[] = [];

  switch (event) {
    case 'profile_updated':
      keys.push(`user:profile:${userId}`, `matches:scores:${userId}`, `jobs:today:${userId}`);
      break;
    case 'application_created':
    case 'application_status_changed':
      keys.push(`analytics:overview:${userId}`, `analytics:weekly:${userId}`, `user:usage:${userId}`);
      break;
    case 'resume_generated':
      keys.push(`user:usage:${userId}`);
      break;
    case 'subscription_changed':
      keys.push(`subscription:status:${userId}`, `user:profile:${userId}`);
      break;
    case 'new_jobs_fetched':
      // Invalidate all job feeds (global event)
      keys.push('jobs:feed:*');
      break;
    case 'follow_up_completed':
      keys.push(`analytics:overview:${userId}`);
      break;
  }

  return keys;
}

// React Query invalidation helper for client-side
export function getQueryKeysToInvalidate(event: InvalidationEvent): string[][] {
  switch (event) {
    case 'profile_updated':
      return [['profile'], ['jobs', 'feed'], ['jobs', 'today']];
    case 'application_created':
    case 'application_status_changed':
      return [['applications'], ['analytics'], ['usage']];
    case 'resume_generated':
      return [['resumes'], ['usage']];
    case 'subscription_changed':
      return [['subscription'], ['profile']];
    case 'new_jobs_fetched':
      return [['jobs']];
    case 'follow_up_completed':
      return [['follow-ups'], ['analytics']];
    default:
      return [];
  }
}
