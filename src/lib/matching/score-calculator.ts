import { MATCH_WEIGHTS } from '@/lib/constants';
import { IParsedJD, IUser, IExperience, IProject, ITargetProfile, IEducation } from '@/types';

interface MatchResult {
  total_score: number;
  skills_score: number;
  experience_score: number;
  education_score: number;
  project_score: number;
  title_score: number;
  matched_skills: string[];
  missing_skills: string[];
  best_projects: string[];
}

export function calculateMatchScore(
  parsedJD: IParsedJD,
  userSkills: string[],
  experiences: IExperience[],
  projects: IProject[],
  education: IEducation[],
  targetProfile: ITargetProfile
): MatchResult {
  // Skills match
  const normalizedUserSkills = userSkills.map(s => s.toLowerCase().trim());
  const requiredSkills = parsedJD.required_skills.map(s => s.toLowerCase().trim());
  const matchedSkills = requiredSkills.filter(s =>
    normalizedUserSkills.some(us => us.includes(s) || s.includes(us))
  );
  const missingSkills = requiredSkills.filter(s => !matchedSkills.includes(s));
  const skillsScore = requiredSkills.length > 0
    ? matchedSkills.length / requiredSkills.length
    : 0.5;

  // Experience match
  const totalYears = experiences.reduce((sum, exp) => {
    const start = new Date(exp.start_date).getTime();
    const end = exp.end_date ? new Date(exp.end_date).getTime() : Date.now();
    return sum + (end - start) / (365.25 * 24 * 60 * 60 * 1000);
  }, 0);
  const requiredMin = parsedJD.experience_years.min || 0;
  const experienceScore = totalYears >= requiredMin ? 1.0
    : totalYears >= requiredMin * 0.7 ? 0.7
    : totalYears >= requiredMin * 0.5 ? 0.4
    : 0.2;

  // Education match
  const hasRequiredEdu = education.length > 0 ? 0.8 : 0.4;
  const educationScore = parsedJD.education_requirements.length > 0 ? hasRequiredEdu : 0.7;

  // Project relevance
  const projectScores = projects.map(project => {
    const projTech = project.technologies.map(t => t.toLowerCase());
    const overlap = requiredSkills.filter(s => projTech.some(pt => pt.includes(s) || s.includes(pt)));
    return { id: project.id, score: requiredSkills.length > 0 ? overlap.length / requiredSkills.length : 0.3 };
  });
  projectScores.sort((a, b) => b.score - a.score);
  const bestProjects = projectScores.slice(0, 3).map(p => p.id);
  const projectScore = projectScores.length > 0
    ? Math.min(1, projectScores.slice(0, 3).reduce((s, p) => s + p.score, 0) / 3 * 1.2)
    : 0.2;

  // Title match
  const jobTitle = parsedJD.keywords.join(' ').toLowerCase();
  const profileTitles = targetProfile.target_titles.map(t => t.toLowerCase());
  const titleMatch = profileTitles.some(pt =>
    jobTitle.includes(pt) || pt.split(' ').every(word => jobTitle.includes(word))
  );
  const titleScore = titleMatch ? 1.0 : 0.3;

  // Weighted total
  const total = Math.round(
    (skillsScore * MATCH_WEIGHTS.skills +
     experienceScore * MATCH_WEIGHTS.experience +
     educationScore * MATCH_WEIGHTS.education +
     projectScore * MATCH_WEIGHTS.project_relevance +
     titleScore * MATCH_WEIGHTS.title_match) * 100
  );

  return {
    total_score: Math.min(100, Math.max(0, total)),
    skills_score: Math.round(skillsScore * 100),
    experience_score: Math.round(experienceScore * 100),
    education_score: Math.round(educationScore * 100),
    project_score: Math.round(projectScore * 100),
    title_score: Math.round(titleScore * 100),
    matched_skills: matchedSkills,
    missing_skills: missingSkills,
    best_projects: bestProjects,
  };
}
