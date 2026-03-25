import { SubscriptionTier, IWeeklyUsage } from '@/types';
import { TIER_LIMITS } from '@/lib/constants';

type GateAction = 'apply' | 'generate_resume' | 'generate_message' | 'generate_cover_letter' |
  'create_profile' | 'interview_prep' | 'download_latex' | 'download_pdf' | 'calendar' |
  'daily_briefing' | 'power_hour' | 'warm_path' | 'salary_intel' | 'advanced_analytics';

interface GateResult {
  allowed: boolean;
  reason?: string;
  upgrade_message?: string;
  usage?: { current: number; limit: number | null };
}

export function checkTierAccess(
  tier: SubscriptionTier,
  action: GateAction,
  weeklyUsage?: IWeeklyUsage
): GateResult {
  const limits = TIER_LIMITS[tier];

  // Feature gates (boolean checks)
  const featureGates: Record<string, boolean> = {
    calendar: limits.has_calendar,
    daily_briefing: limits.has_daily_briefing,
    power_hour: limits.has_power_hour,
    interview_prep: limits.has_interview_prep,
    warm_path: limits.has_warm_path,
    salary_intel: limits.has_salary_intel,
    advanced_analytics: limits.has_advanced_analytics,
  };

  if (action in featureGates) {
    if (!featureGates[action]) {
      const tierNeeded = action === 'interview_prep' || action === 'warm_path' || 
        action === 'salary_intel' || action === 'advanced_analytics' ? 'Pro' : 'Popular';
      return {
        allowed: false,
        reason: `This feature requires the ${tierNeeded} plan.`,
        upgrade_message: `Upgrade to ${tierNeeded} to unlock this feature.`,
      };
    }
    return { allowed: true };
  }

  // Format gates
  if (action === 'download_latex' || action === 'download_pdf') {
    const format = action === 'download_latex' ? 'latex' : 'pdf';
    if (!limits.export_formats.includes(format as any)) {
      return {
        allowed: false,
        reason: 'PDF and LaTeX export requires the Popular plan.',
        upgrade_message: 'Upgrade to Popular to download in PDF and LaTeX formats.',
      };
    }
    return { allowed: true };
  }

  // Usage-based gates
  if (!weeklyUsage) return { allowed: true };

  const usageMap: Record<string, { current: number; limit: number | null }> = {
    apply: { current: weeklyUsage.applications_count, limit: limits.applications_per_week },
    generate_resume: { current: weeklyUsage.resumes_generated, limit: limits.resumes_per_week },
    generate_message: { current: weeklyUsage.messages_generated, limit: limits.messages_per_week },
    generate_cover_letter: { current: weeklyUsage.cover_letters_generated, limit: limits.cover_letters_per_week },
  };

  if (action in usageMap) {
    const { current, limit } = usageMap[action];
    if (limit !== null && current >= limit) {
      return {
        allowed: false,
        reason: `You've used ${current} of ${limit} free ${action.replace('_', ' ')}s this week.`,
        upgrade_message: 'Upgrade to Popular for unlimited access.',
        usage: { current, limit },
      };
    }
    return { allowed: true, usage: { current, limit } };
  }

  // Profile count gate
  if (action === 'create_profile') {
    // This would need a separate count query — handled at the API level
    return { allowed: true };
  }

  return { allowed: true };
}
