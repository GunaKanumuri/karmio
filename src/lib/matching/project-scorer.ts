import { IProject, IParsedJD } from '@/types';

export interface ScoredProject extends IProject {
  relevance_score: number;    // 0-100
  fit_category: 'best_fit' | 'close_fit' | 'low_fit';
  matched_keywords: string[];
  reason: string;
}

/**
 * Scores ALL user projects against a JD and categorizes them.
 * Returns sorted: best fit first, then close fit, then low fit.
 * 
 * Used by:
 * - Resume builder (to auto-select 2 best + show 2 close as alternatives)
 * - Job detail page (to show project relevance)
 * - Feed's tailor panel (to preview which projects match)
 */
export function scoreProjects(
  projects: IProject[],
  parsedJD: IParsedJD | null,
  careerStage?: string,
): ScoredProject[] {
  if (!parsedJD || !projects.length) {
    return projects.map(p => ({
      ...p,
      relevance_score: 0,
      fit_category: 'low_fit' as const,
      matched_keywords: [],
      reason: 'No job description to compare against.',
    }));
  }

  const jdKeywords = [
    ...parsedJD.required_skills,
    ...parsedJD.preferred_skills,
    ...parsedJD.keywords,
  ].map(k => k.toLowerCase());

  const scored = projects.map(project => {
    let score = 0;
    const matchedKeywords: string[] = [];

    const techLower = (project.technologies || []).map(t => t.toLowerCase());
    const descLower = (project.description || '').toLowerCase();
    const titleLower = (project.title || '').toLowerCase();
    const contribLower = (project.contributions || '').toLowerCase();
    const resultsLower = (project.results || '').toLowerCase();
    const allText = `${titleLower} ${descLower} ${contribLower} ${resultsLower}`;

    // Score tech stack matches (highest weight)
    for (const kw of jdKeywords) {
      if (techLower.some(t => t.includes(kw) || kw.includes(t))) {
        score += 15;
        if (!matchedKeywords.includes(kw)) matchedKeywords.push(kw);
      }
    }

    // Score description/contribution matches
    for (const kw of jdKeywords) {
      if (allText.includes(kw) && !matchedKeywords.includes(kw)) {
        score += 8;
        matchedKeywords.push(kw);
      }
    }

    // Bonus for projects with results/outcomes (shows impact)
    if (project.results && project.results.length > 20) score += 5;

    // Bonus for projects with contributions detail
    if (project.contributions && project.contributions.length > 20) score += 3;

    // Career stage adjustment:
    // Students/early career: academic + side projects get a boost
    // Senior: professional projects weighted higher
    if (careerStage === 'student' || careerStage === 'early') {
      if (project.project_type === 'university' || project.project_type === 'personal') score += 8;
    } else if (careerStage === 'senior' || careerStage === 'executive') {
      if (project.project_type === 'professional') score += 10;
    }

    // GitHub link = bonus (shows code is real)
    if (project.github_link) score += 3;

    score = Math.min(100, score);

    // Categorize
    let fit_category: 'best_fit' | 'close_fit' | 'low_fit';
    if (score >= 40) fit_category = 'best_fit';
    else if (score >= 20) fit_category = 'close_fit';
    else fit_category = 'low_fit';

    // Human-readable reason
    let reason = '';
    if (matchedKeywords.length >= 3) {
      reason = `Strong match: uses ${matchedKeywords.slice(0, 3).join(', ')}`;
    } else if (matchedKeywords.length > 0) {
      reason = `Partial match: uses ${matchedKeywords.join(', ')}`;
    } else {
      reason = 'No keyword overlap with this JD';
    }

    return {
      ...project,
      relevance_score: score,
      fit_category,
      matched_keywords: matchedKeywords,
      reason,
    };
  });

  // Sort: best fit first
  scored.sort((a, b) => b.relevance_score - a.relevance_score);
  return scored;
}

/**
 * Get the recommended project selection for a resume.
 * Returns { selected: top 2 best fit, alternatives: next 2 close fit }
 * 
 * If user is student/intern: may recommend 3 projects instead of 2
 */
export function getRecommendedProjects(
  scoredProjects: ScoredProject[],
  careerStage?: string,
): {
  selected: ScoredProject[];
  alternatives: ScoredProject[];
  explanation: string;
} {
  const maxSelected = (careerStage === 'student' || careerStage === 'early') ? 3 : 2;

  const bestFit = scoredProjects.filter(p => p.fit_category === 'best_fit');
  const closeFit = scoredProjects.filter(p => p.fit_category === 'close_fit');

  // Pick top N best fit as selected
  const selected = bestFit.slice(0, maxSelected);

  // If not enough best fit, fill from close fit
  if (selected.length < maxSelected) {
    const remaining = maxSelected - selected.length;
    selected.push(...closeFit.slice(0, remaining));
  }

  // Alternatives: next 2 that aren't already selected
  const selectedIds = new Set(selected.map(p => p.id));
  const alternatives = scoredProjects
    .filter(p => !selectedIds.has(p.id) && p.relevance_score > 0)
    .slice(0, 2);

  const explanation = careerStage === 'student' || careerStage === 'early'
    ? `As an ${careerStage === 'student' ? 'intern/student' : 'early career'} candidate, we recommend ${maxSelected} projects to showcase your hands-on experience.`
    : `We selected the ${selected.length} most relevant projects for this role. ${alternatives.length > 0 ? `${alternatives.length} close alternatives are available if you prefer.` : ''}`;

  return { selected, alternatives, explanation };
}