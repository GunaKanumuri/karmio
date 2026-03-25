/**
 * Ghost Job Detector
 * 
 * Identifies potentially stale or "ghost" job postings that may no longer
 * be actively recruiting. These are jobs that:
 * - Have been posted for over 60 days
 * - Have low engagement signals
 * - Show patterns of repeated reposting
 */

import { IJobCardData } from '@/types';

export interface GhostJobAnalysis {
  isGhost: boolean;
  ghostScore: number; // 0-100, higher = more likely ghost
  reasons: string[];
  recommendation: 'apply' | 'proceed_with_caution' | 'skip';
}

export function analyzeGhostJob(job: IJobCardData): GhostJobAnalysis {
  const reasons: string[] = [];
  let ghostScore = 0;

  const now = new Date();
  const firstSeen = new Date(job.first_seen_at);
  const daysSincePosted = Math.floor((now.getTime() - firstSeen.getTime()) / (1000 * 60 * 60 * 24));

  // Age-based scoring
  if (daysSincePosted > 90) {
    ghostScore += 40;
    reasons.push(`Posted ${daysSincePosted} days ago`);
  } else if (daysSincePosted > 60) {
    ghostScore += 25;
    reasons.push(`Posted over 2 months ago`);
  } else if (daysSincePosted > 30) {
    ghostScore += 10;
  }

  // Realness score from job fetcher
  if (job.realness_score < 50) {
    ghostScore += 20;
    reasons.push('Low verification score');
  } else if (job.realness_score < 70) {
    ghostScore += 10;
  }

  // Check for vague descriptions
  if (job.description_raw && job.description_raw.length < 200) {
    ghostScore += 15;
    reasons.push('Unusually short job description');
  }

  // Check for missing salary info after 30 days
  if (daysSincePosted > 30 && (!job.salary_min || !job.salary_max)) {
    ghostScore += 5;
  }

  // Source reliability
  const reliableSources = ['greenhouse', 'lever', 'ashby'];
  if (!reliableSources.includes(job.source_type)) {
    ghostScore += 10;
  }

  // Cap at 100
  ghostScore = Math.min(100, ghostScore);

  // Determine recommendation
  let recommendation: 'apply' | 'proceed_with_caution' | 'skip';
  if (ghostScore >= 50) {
    recommendation = 'skip';
  } else if (ghostScore >= 25) {
    recommendation = 'proceed_with_caution';
  } else {
    recommendation = 'apply';
  }

  return {
    isGhost: ghostScore >= 40,
    ghostScore,
    reasons,
    recommendation,
  };
}

export function getGhostLabel(analysis: GhostJobAnalysis): string | null {
  if (analysis.ghostScore >= 50) {
    return 'Likely inactive';
  } else if (analysis.ghostScore >= 30) {
    return 'May be stale';
  }
  return null;
}

export function getGhostColor(analysis: GhostJobAnalysis): 'red' | 'amber' | 'green' {
  if (analysis.ghostScore >= 50) return 'red';
  if (analysis.ghostScore >= 25) return 'amber';
  return 'green';
}

/**
 * Calculate job freshness score (inverse of ghost score)
 * Higher = fresher and more likely active
 */
export function getFreshnessScore(job: IJobCardData): number {
  const analysis = analyzeGhostJob(job);
  return 100 - analysis.ghostScore;
}

/**
 * Get human-readable freshness label
 */
export function getFreshnessLabel(job: IJobCardData): string {
  const freshness = getFreshnessScore(job);
  if (freshness >= 90) return 'Very fresh';
  if (freshness >= 70) return 'Fresh';
  if (freshness >= 50) return 'Active';
  if (freshness >= 30) return 'May be stale';
  return 'Likely inactive';
}
