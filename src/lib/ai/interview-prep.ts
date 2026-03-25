import { IParsedJD } from '@/types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export type PrepType = 'hr' | 'technical' | 'behavioral' | 'offer';

interface PrepResult {
  topics: string[];
  questions: Array<{ question: string; tip: string }>;
  resources: string[];
}

export async function generateInterviewPrep(
  prepType: PrepType,
  jobTitle: string,
  companyName: string,
  parsedJD: IParsedJD,
  userExperienceYears: number,
  visaStatus?: string | null
): Promise<PrepResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return fallbackPrep(prepType, jobTitle, parsedJD, visaStatus);
  }

  const typeInstructions: Record<PrepType, string> = {
    hr: `Generate HR screening interview prep. Include questions about: background, why this company, salary expectations, availability, and ${visaStatus ? 'how to positively position visa status (' + visaStatus + ')' : 'career goals'}.`,
    technical: `Generate technical interview prep based on the required skills: ${parsedJD.required_skills.join(', ')}. Include coding patterns, system design basics, and common technical questions for a ${jobTitle} role.`,
    behavioral: `Generate behavioral interview prep using STAR method. Create scenarios mapped to common ${jobTitle} responsibilities: ${parsedJD.responsibilities.slice(0, 3).join('; ')}.`,
    offer: `Generate offer negotiation prep for a ${jobTitle} at ${companyName}. Include salary research tips, counter-offer scripts, and how to evaluate total compensation.`,
  };

  const prompt = `${typeInstructions[prepType]}

Job: ${jobTitle} at ${companyName}
Required skills: ${parsedJD.required_skills.join(', ')}
Experience level: ${userExperienceYears} years

Respond ONLY with JSON:
{
  "topics": ["topic1", "topic2", ...],
  "questions": [{"question": "...", "tip": "..."}],
  "resources": ["resource1", "resource2"]
}

Generate 5-8 questions with tips. Keep tips actionable and specific.`;

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
    console.error('Interview prep generation failed:', err);
    return fallbackPrep(prepType, jobTitle, parsedJD, visaStatus);
  }
}

function fallbackPrep(type: PrepType, title: string, jd: IParsedJD, visa?: string | null): PrepResult {
  const common = {
    hr: {
      topics: ['Company research', 'Role motivation', 'Salary expectations', 'Availability'],
      questions: [
        { question: 'Tell me about yourself.', tip: 'Keep it under 2 minutes. Focus on relevant experience and why this role excites you.' },
        { question: 'Why are you interested in this company?', tip: 'Research the company mission, recent news, and products. Be specific.' },
        { question: 'What are your salary expectations?', tip: 'Research market rates on Levels.fyi and Glassdoor before answering.' },
        { question: 'When can you start?', tip: 'Be honest about notice periods. Most companies are flexible with 2-4 weeks.' },
        ...(visa ? [{ question: 'What is your work authorization status?', tip: `Present ${visa} positively. Focus on your legal right to work and timeline.` }] : []),
      ],
      resources: ['Company career page', 'Glassdoor reviews', 'LinkedIn company page'],
    },
    technical: {
      topics: jd.required_skills.slice(0, 6),
      questions: [
        { question: `Describe your experience with ${jd.required_skills[0] || 'the primary tech stack'}.`, tip: 'Use specific project examples with measurable outcomes.' },
        { question: 'Walk me through a system you designed.', tip: 'Start with requirements, then architecture decisions, tradeoffs, and results.' },
        { question: 'How do you handle a production incident?', tip: 'Show a structured approach: assess, communicate, fix, postmortem.' },
        { question: 'Write code to solve [problem].', tip: 'Think aloud, clarify requirements, start with brute force, then optimize.' },
        { question: 'What would you improve about our product?', tip: 'Use the product beforehand. Give a specific, thoughtful suggestion.' },
      ],
      resources: ['LeetCode (medium difficulty)', 'System Design Primer on GitHub', 'Company tech blog'],
    },
    behavioral: {
      topics: ['Leadership', 'Conflict resolution', 'Problem solving', 'Teamwork'],
      questions: [
        { question: 'Tell me about a time you disagreed with a teammate.', tip: 'STAR method: Situation, Task, Action, Result. Focus on resolution.' },
        { question: 'Describe a project that failed.', tip: 'Show ownership, what you learned, and how you applied those lessons.' },
        { question: 'How do you prioritize competing deadlines?', tip: 'Show a framework: urgency vs importance, stakeholder communication.' },
        { question: 'Give an example of going above and beyond.', tip: 'Pick a story with clear, measurable impact beyond your job description.' },
      ],
      resources: ['Amazon Leadership Principles (good framework)', 'STAR method practice'],
    },
    offer: {
      topics: ['Salary negotiation', 'Equity evaluation', 'Benefits comparison', 'Counter-offer strategy'],
      questions: [
        { question: 'The offer is $X. What do you think?', tip: 'Never accept immediately. Express enthusiasm, then ask for time to review.' },
        { question: 'Can we do better on base salary?', tip: 'Use competing offers or market data as leverage. Be specific with numbers.' },
        { question: 'How do I evaluate equity?', tip: 'Ask about strike price, vesting schedule, latest valuation, and dilution.' },
      ],
      resources: ['Levels.fyi for salary data', 'Blind app for compensation discussions'],
    },
  };
  return common[type];
}
