import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for the AI resume tailor.
 *
 * We verify two scenarios:
 *  1. When ANTHROPIC_API_KEY is missing, the fallback path is used
 *     (no network call, original content returned with matched keywords).
 *  2. When the Claude API returns valid JSON, results are parsed correctly.
 */

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockExperiences = [
  {
    id: 'exp-1',
    title: 'Software Engineer',
    company: 'Tech Corp',
    bullets: [
      'Built REST APIs using Node.js and TypeScript',
      'Reduced page load time by 40% via caching',
    ],
  },
  {
    id: 'exp-2',
    title: 'Junior Developer',
    company: 'Start Up Inc',
    bullets: ['Developed React components', 'Wrote unit tests with Jest'],
  },
];

const mockProjects = [
  {
    id: 'proj-1',
    title: 'Portfolio Site',
    description: 'Personal portfolio built with Next.js and Tailwind CSS',
    technologies: ['Next.js', 'TypeScript', 'Tailwind CSS'],
  },
];

const mockParsedJD = {
  required_skills: ['TypeScript', 'React', 'Node.js', 'REST API'],
  responsibilities: ['Design scalable APIs', 'Collaborate with product team'],
  nice_to_have: ['GraphQL', 'Docker'],
};

const mockSummary =
  'Experienced software engineer with 4 years building web applications.';

// ─── Fallback behaviour (no API key) ──────────────────────────────────────────

describe('tailorResume — fallback when no API key', () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('returns untailored experience bullets', async () => {
    const { tailorResume } = await import('@/lib/ai/resume-tailor');

    const result = await tailorResume(
      mockExperiences as any,
      mockProjects as any,
      mockParsedJD as any,
      mockSummary,
      'Software Engineer',
      'Acme Corp'
    );

    // Summary is returned unchanged
    expect(result.enhanced_summary).toBe(mockSummary);

    // Original bullets are preserved for each experience
    mockExperiences.forEach(exp => {
      expect(result.enhanced_bullets[exp.id]).toEqual(exp.bullets);
    });
  });

  it('reports matched keywords that appear in the resume text', async () => {
    const { tailorResume } = await import('@/lib/ai/resume-tailor');

    const result = await tailorResume(
      mockExperiences as any,
      mockProjects as any,
      mockParsedJD as any,
      mockSummary,
      'Software Engineer',
      'Acme Corp'
    );

    // 'TypeScript', 'React', 'Node.js' all appear in the resume text
    expect(result.keywords_used).toContain('TypeScript');
    expect(result.keywords_used).toContain('React');
    expect(result.keywords_used).toContain('Node.js');

    // 'REST API' is in the JD but the exact string 'rest api' must appear in text
    // (it does: "Built REST APIs using Node.js") — case-insensitive check
    expect(result.keywords_used).toContain('REST API');
  });

  it('returns an empty keywords_used array when nothing matches', async () => {
    const { tailorResume } = await import('@/lib/ai/resume-tailor');

    const jdWithNoMatches = {
      required_skills: ['COBOL', 'Fortran'],
      responsibilities: [],
      nice_to_have: [],
    };

    const result = await tailorResume(
      mockExperiences as any,
      mockProjects as any,
      jdWithNoMatches as any,
      mockSummary,
      'Legacy Engineer',
      'Old Corp'
    );

    expect(result.keywords_used).toHaveLength(0);
  });
});

// ─── API path (mocked Claude response) ───────────────────────────────────────

describe('tailorResume — when Claude API responds', () => {
  const mockApiResponse = {
    enhanced_summary: 'Experienced TypeScript and Node.js engineer with proven API design skills.',
    enhanced_bullets: {
      'exp-1': [
        'Designed and shipped RESTful APIs in TypeScript, serving 10M+ requests/day',
        'Cut page load time 40% using Redis caching — matching JD requirement for performance optimization',
      ],
      'exp-2': [
        'Built reusable React component library consumed across 5 product teams',
        'Maintained > 90% test coverage with Jest',
      ],
    },
    keywords_used: ['TypeScript', 'Node.js', 'REST API', 'React'],
  };

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'sk-test-key';

    global.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          content: [{ text: JSON.stringify(mockApiResponse) }],
        }),
    }) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('returns the Claude-enhanced summary', async () => {
    // Re-import after setting the env var so the module sees it
    vi.resetModules();
    const { tailorResume } = await import('@/lib/ai/resume-tailor');

    const result = await tailorResume(
      mockExperiences as any,
      mockProjects as any,
      mockParsedJD as any,
      mockSummary,
      'Software Engineer',
      'Acme Corp'
    );

    expect(result.enhanced_summary).toBe(mockApiResponse.enhanced_summary);
  });

  it('returns enhanced bullets from the API response', async () => {
    vi.resetModules();
    const { tailorResume } = await import('@/lib/ai/resume-tailor');

    const result = await tailorResume(
      mockExperiences as any,
      mockProjects as any,
      mockParsedJD as any,
      mockSummary,
      'Software Engineer',
      'Acme Corp'
    );

    expect(result.enhanced_bullets['exp-1']).toEqual(mockApiResponse.enhanced_bullets['exp-1']);
    expect(result.keywords_used).toContain('TypeScript');
  });

  it('falls back gracefully when the API returns malformed JSON', async () => {
    vi.resetModules();
    process.env.ANTHROPIC_API_KEY = 'sk-test-key';

    global.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          content: [{ text: 'not valid json {{{' }],
        }),
    }) as any;

    const { tailorResume } = await import('@/lib/ai/resume-tailor');

    const result = await tailorResume(
      mockExperiences as any,
      mockProjects as any,
      mockParsedJD as any,
      mockSummary,
      'Software Engineer',
      'Acme Corp'
    );

    // Should fall back to original summary
    expect(result.enhanced_summary).toBe(mockSummary);
  });
});
