// PDF Builder — generates resume as PDF using recipe + profile data
// In production, this uses @react-pdf/renderer on the server
// For now, provides the data structure that the client-side renderer needs

import { IUser, IExperience, IProject, IEducation, IResumeRecipe } from '@/types';
import { generateResumeFilename } from './filename';

export interface PDFResumeData {
  name: string;
  contact: string[];
  summary: string;
  experiences: Array<{
    title: string; company: string; dates: string; bullets: string[];
  }>;
  projects: Array<{
    title: string; technologies: string; description: string; results?: string;
  }>;
  education: Array<{
    degree: string; institution: string; date?: string;
  }>;
  skills: string[];
  filename: string;
}

export function buildPDFResumeData(
  user: IUser,
  experiences: IExperience[],
  projects: IProject[],
  education: IEducation[],
  recipe: IResumeRecipe,
  skills: string[],
  companyName: string
): PDFResumeData {
  const selectedProjects = projects.filter(p => recipe.selected_project_ids.includes(p.id));

  const contact: string[] = [];
  if (user.email) contact.push(user.email);
  if (user.phone) contact.push(user.phone);
  if (user.linkedin_url) contact.push(user.linkedin_url);
  if (user.github_url) contact.push(user.github_url);
  if (user.portfolio_url) contact.push(user.portfolio_url);

  return {
    name: user.full_name || 'Your Name',
    contact,
    summary: recipe.enhanced_summary || '',
    experiences: experiences.map(exp => ({
      title: exp.title,
      company: exp.company,
      dates: `${exp.start_date} — ${exp.is_current ? 'Present' : exp.end_date || ''}`,
      bullets: (recipe.enhanced_bullets[exp.id] || exp.bullets) as string[],
    })),
    projects: selectedProjects.map(p => ({
      title: p.title,
      technologies: p.technologies.join(', '),
      description: p.contributions || p.description,
      results: p.results || undefined,
    })),
    education: education.map(e => ({
      degree: `${e.degree} in ${e.field || ''}`.trim(),
      institution: e.institution,
      date: e.graduation_date || undefined,
    })),
    skills,
    filename: generateResumeFilename(
      user.full_name?.split(' ')[0] || 'user',
      user.full_name?.split(' ').slice(1).join(' ') || 'resume',
      companyName,
      'pdf'
    ),
  };
}
