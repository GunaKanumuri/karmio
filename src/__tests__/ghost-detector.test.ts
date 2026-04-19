import { describe, it, expect } from 'vitest';
import {
  analyzeGhostJob,
  getGhostLabel,
  getGhostColor,
  getFreshnessScore,
} from '@/lib/jobs/ghost-detector';
import type { IJobCardData } from '@/types';

// ─── Test fixtures ────────────────────────────────────────────────────────────

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function makeJob(overrides: Partial<IJobCardData> = {}): IJobCardData {
  return {
    id: 'test-job-1',
    title: 'Software Engineer',
    company_name: 'Acme Corp',
    location: 'San Francisco, CA',
    remote_type: 'hybrid',
    source_type: 'greenhouse',
    source_url: 'https://boards.greenhouse.io/acme/jobs/1',
    ats_board_url: 'https://boards.greenhouse.io/acme',
    first_seen_at: daysAgo(1),
    description_raw: 'A'.repeat(500), // substantial description
    realness_score: 90,
    salary_min: 120_000,
    salary_max: 160_000,
    is_active: true,
    sponsorship_status: 'not_specified',
    country: 'US',
    ...overrides,
  } as IJobCardData;
}

// ─── analyzeGhostJob ──────────────────────────────────────────────────────────

describe('analyzeGhostJob', () => {
  it('gives a fresh, verified job a very low ghost score', () => {
    const job = makeJob();
    const result = analyzeGhostJob(job);

    expect(result.ghostScore).toBeLessThan(15);
    expect(result.recommendation).toBe('apply');
    expect(result.isGhost).toBe(false);
    expect(result.reasons).toHaveLength(0);
  });

  it('scores a 95-day-old job heavily', () => {
    const job = makeJob({ first_seen_at: daysAgo(95) });
    const result = analyzeGhostJob(job);

    expect(result.ghostScore).toBeGreaterThanOrEqual(40);
    expect(result.reasons.some(r => r.includes('days ago'))).toBe(true);
  });

  it('scores a 65-day-old job moderately', () => {
    const job = makeJob({ first_seen_at: daysAgo(65) });
    const result = analyzeGhostJob(job);

    expect(result.ghostScore).toBeGreaterThanOrEqual(25);
    expect(result.reasons.some(r => r.includes('2 months'))).toBe(true);
  });

  it('penalises a low realness_score', () => {
    const fresh = makeJob({ realness_score: 90 });
    const stale = makeJob({ realness_score: 40 });

    expect(analyzeGhostJob(stale).ghostScore).toBeGreaterThan(
      analyzeGhostJob(fresh).ghostScore
    );
    expect(analyzeGhostJob(stale).reasons).toContain('Low verification score');
  });

  it('penalises a very short job description', () => {
    const job = makeJob({ description_raw: 'Short.' });
    const result = analyzeGhostJob(job);

    expect(result.ghostScore).toBeGreaterThan(0);
    expect(result.reasons).toContain('Unusually short job description');
  });

  it('penalises an unreliable source type', () => {
    const fromGreenhouse = makeJob({ source_type: 'greenhouse' });
    const fromUnknown = makeJob({ source_type: 'scraper' as any });

    expect(analyzeGhostJob(fromUnknown).ghostScore).toBeGreaterThan(
      analyzeGhostJob(fromGreenhouse).ghostScore
    );
  });

  it('caps the ghost score at 100', () => {
    const worstCase = makeJob({
      first_seen_at: daysAgo(120),
      realness_score: 10,
      description_raw: 'Bad.',
      source_type: 'unknown' as any,
      salary_min: null as any,
      salary_max: null as any,
    });
    const result = analyzeGhostJob(worstCase);

    expect(result.ghostScore).toBeLessThanOrEqual(100);
  });

  it('marks recommendation as skip when ghost score >= 50', () => {
    const job = makeJob({
      first_seen_at: daysAgo(120),
      realness_score: 30,
      description_raw: 'Short.',
      source_type: 'unknown' as any,
    });
    const result = analyzeGhostJob(job);

    expect(result.recommendation).toBe('skip');
    expect(result.isGhost).toBe(true);
  });

  it('marks recommendation as proceed_with_caution for moderate scores', () => {
    const job = makeJob({
      first_seen_at: daysAgo(65),
      realness_score: 60,
    });
    const result = analyzeGhostJob(job);

    // 65 days → +25, moderate realness → 0. Score = 25.
    expect(result.ghostScore).toBeGreaterThanOrEqual(25);
    expect(result.ghostScore).toBeLessThan(50);
    expect(result.recommendation).toBe('proceed_with_caution');
  });
});

// ─── getGhostLabel ────────────────────────────────────────────────────────────

describe('getGhostLabel', () => {
  it('returns null for a fresh job', () => {
    const analysis = analyzeGhostJob(makeJob());
    expect(getGhostLabel(analysis)).toBeNull();
  });

  it('returns "May be stale" for moderate ghost scores', () => {
    const job = makeJob({ first_seen_at: daysAgo(65), realness_score: 60 });
    const analysis = analyzeGhostJob(job);
    if (analysis.ghostScore >= 30 && analysis.ghostScore < 50) {
      expect(getGhostLabel(analysis)).toBe('May be stale');
    }
  });

  it('returns "Likely inactive" for high ghost scores', () => {
    const job = makeJob({
      first_seen_at: daysAgo(120),
      realness_score: 20,
      description_raw: 'x',
      source_type: 'unknown' as any,
    });
    const analysis = analyzeGhostJob(job);
    expect(getGhostLabel(analysis)).toBe('Likely inactive');
  });
});

// ─── getGhostColor ────────────────────────────────────────────────────────────

describe('getGhostColor', () => {
  it('returns green for a fresh job', () => {
    expect(getGhostColor(analyzeGhostJob(makeJob()))).toBe('green');
  });

  it('returns red for a high ghost-score job', () => {
    const job = makeJob({
      first_seen_at: daysAgo(120),
      realness_score: 20,
      description_raw: 'x',
      source_type: 'unknown' as any,
    });
    expect(getGhostColor(analyzeGhostJob(job))).toBe('red');
  });
});

// ─── getFreshnessScore ────────────────────────────────────────────────────────

describe('getFreshnessScore', () => {
  it('is exactly 100 minus ghostScore', () => {
    const job = makeJob({ first_seen_at: daysAgo(65) });
    const analysis = analyzeGhostJob(job);
    expect(getFreshnessScore(job)).toBe(100 - analysis.ghostScore);
  });

  it('returns a high value for a fresh verified job', () => {
    expect(getFreshnessScore(makeJob())).toBeGreaterThan(85);
  });
});
