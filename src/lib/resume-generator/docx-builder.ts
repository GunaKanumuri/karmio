import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { IUser, IExperience, IProject, IEducation, IResumeRecipe } from '@/types';
import { generateResumeFilename } from './filename';

interface BuilderInput {
  user: IUser;
  experiences: IExperience[];
  projects: IProject[];
  education: IEducation[];
  recipe: IResumeRecipe;
  skills: string[];
}

export async function buildDocxResume(input: BuilderInput): Promise<{ buffer: Buffer; filename: string }> {
  const { user, experiences, projects, education, recipe, skills } = input;
  const selectedProjects = projects.filter(p => recipe.selected_project_ids.includes(p.id));

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 22 } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      children: [
        // Name
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [new TextRun({ text: user.full_name || 'Your Name', bold: true, size: 28, font: 'Arial' })],
        }),
        // Contact info
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({
            text: [user.email, user.phone, user.linkedin_url, user.github_url].filter(Boolean).join(' | '),
            size: 18, color: '666666', font: 'Arial',
          })],
        }),
        // Summary
        ...(recipe.enhanced_summary ? [
          sectionHeader('Summary'),
          new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: recipe.enhanced_summary, size: 21, font: 'Arial' })] }),
        ] : []),
        // Experience
        sectionHeader('Experience'),
        ...experiences.flatMap(exp => {
          const bullets = recipe.enhanced_bullets[exp.id] || exp.bullets as string[];
          return [
            new Paragraph({
              spacing: { before: 100, after: 40 },
              children: [
                new TextRun({ text: `${exp.title}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` — ${exp.company}`, size: 22, font: 'Arial' }),
              ],
            }),
            new Paragraph({
              spacing: { after: 60 },
              children: [new TextRun({
                text: `${exp.start_date} — ${exp.is_current ? 'Present' : exp.end_date || ''}`,
                size: 18, color: '888888', italics: true, font: 'Arial',
              })],
            }),
            ...bullets.map(bullet => new Paragraph({
              spacing: { after: 40 },
              children: [new TextRun({ text: `• ${bullet}`, size: 21, font: 'Arial' })],
            })),
          ];
        }),
        // Projects
        ...(selectedProjects.length > 0 ? [
          sectionHeader('Projects'),
          ...selectedProjects.flatMap(proj => [
            new Paragraph({
              spacing: { before: 80, after: 40 },
              children: [
                new TextRun({ text: proj.title, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` (${proj.technologies.join(', ')})`, size: 20, color: '666666', font: 'Arial' }),
              ],
            }),
            new Paragraph({
              spacing: { after: 40 },
              children: [new TextRun({ text: `• ${proj.contributions || proj.description}`, size: 21, font: 'Arial' })],
            }),
            ...(proj.results ? [new Paragraph({
              spacing: { after: 60 },
              children: [new TextRun({ text: `• Impact: ${proj.results}`, size: 21, font: 'Arial' })],
            })] : []),
          ]),
        ] : []),
        // Education
        ...(education.length > 0 ? [
          sectionHeader('Education'),
          ...education.map(edu => new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: `${edu.degree} in ${edu.field || 'N/A'}`, bold: true, size: 22, font: 'Arial' }),
              new TextRun({ text: ` — ${edu.institution}`, size: 22, font: 'Arial' }),
              new TextRun({ text: edu.graduation_date ? ` (${edu.graduation_date})` : '', size: 20, color: '888888', font: 'Arial' }),
            ],
          })),
        ] : []),
        // Skills
        sectionHeader('Skills'),
        new Paragraph({
          spacing: { after: 60 },
          children: [new TextRun({ text: skills.join(' • '), size: 21, font: 'Arial' })],
        }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const companyName = ''; // Would come from job data
  const filename = generateResumeFilename(
    user.full_name?.split(' ')[0] || 'user',
    user.full_name?.split(' ').slice(1).join(' ') || 'resume',
    companyName || 'resume',
    'docx'
  );

  return { buffer: Buffer.from(buffer), filename };
}

function sectionHeader(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 22, font: 'Arial', color: '333333' })],
  });
}
