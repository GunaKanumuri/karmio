import { IExperience, IProject, IParsedJD } from '@/types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

interface TailorResult {
  enhanced_summary: string;
  enhanced_bullets: Record<string, string[]>;
  keywords_used: string[];
}

export async function tailorResume(
  experiences: IExperience[],
  selectedProjects: IProject[],
  parsedJD: IParsedJD,
  userSummary: string,
  jobTitle: string,
  companyName: string
): Promise<TailorResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Fallback: return untailored content when no API key
    return fallbackTailor(experiences, selectedProjects, parsedJD, userSummary);
  }

  const prompt = `You are a professional resume writer. Tailor the following resume content for a ${jobTitle} position at ${companyName}.

Job requirements: ${parsedJD.required_skills.join(', ')}
Key responsibilities: ${parsedJD.responsibilities.join('; ')}

User's current summary: ${userSummary}

User's experience:
${experiences.map(e => `${e.title} at ${e.company}: ${(e.bullets as string[]).join('; ')}`).join('\n')}

User's selected projects:
${selectedProjects.map(p => `${p.title}: ${p.description} (Tech: ${p.technologies.join(', ')})`).join('\n')}

Instructions:
1. Rewrite the summary to naturally incorporate relevant keywords from the job requirements
2. Enhance experience bullets to highlight skills matching the JD without fabricating anything
3. Keep it truthful — only rephrase and emphasize, never add fake experience

Respond ONLY with JSON:
{
  "enhanced_summary": "...",
  "enhanced_bullets": { "experience_id": ["bullet1", "bullet2"] },
  "keywords_used": ["keyword1", "keyword2"]
}`;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('AI tailor failed, using fallback:', err);
    return fallbackTailor(experiences, selectedProjects, parsedJD, userSummary);
  }
}

function fallbackTailor(
  experiences: IExperience[],
  projects: IProject[],
  parsedJD: IParsedJD,
  summary: string
): TailorResult {
  // Rule-based fallback: just return existing content with matched keywords noted
  const allText = [summary, ...experiences.flatMap(e => e.bullets as string[]), ...projects.map(p => p.description)].join(' ').toLowerCase();
  const keywordsUsed = parsedJD.required_skills.filter(s => allText.includes(s.toLowerCase()));

  const enhancedBullets: Record<string, string[]> = {};
  experiences.forEach(e => { enhancedBullets[e.id] = e.bullets as string[]; });

  return { enhanced_summary: summary, enhanced_bullets: enhancedBullets, keywords_used: keywordsUsed };
}
