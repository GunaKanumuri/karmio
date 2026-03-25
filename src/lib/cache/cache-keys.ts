// Cache key namespace conventions: entity:scope:id
// All keys are strings, TTLs in seconds

export const CACHE_KEYS = {
  jobsFeed: (country: string, cursor?: string) => `jobs:feed:${country}:${cursor || 'first'}`,
  jobsToday: (userId: string) => `jobs:today:${userId}`,
  jobDetail: (jobId: string) => `jobs:detail:${jobId}`,
  userProfile: (userId: string) => `user:profile:${userId}`,
  userUsage: (userId: string) => `user:usage:${userId}`,
  analytics: (userId: string) => `analytics:overview:${userId}`,
  analyticsWeekly: (userId: string) => `analytics:weekly:${userId}`,
  subscription: (userId: string) => `subscription:status:${userId}`,
  matchScores: (userId: string) => `matches:scores:${userId}`,
} as const;

export const CACHE_TTL = {
  jobsFeed: 60,          // 1 minute
  jobsToday: 300,        // 5 minutes
  jobDetail: 600,        // 10 minutes
  userProfile: 300,      // 5 minutes (until mutation)
  userUsage: 60,         // 1 minute
  analytics: 300,        // 5 minutes
  analyticsWeekly: 900,  // 15 minutes
  subscription: 900,     // 15 minutes
  matchScores: 300,      // 5 minutes
} as const;
