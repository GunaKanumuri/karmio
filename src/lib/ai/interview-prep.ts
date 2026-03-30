import { IParsedJD } from '@/types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export type PrepStage = 'hr' | 'technical' | 'behavioral' | 'offer';

// ─── Enriched question type ──────────────────────────────────────────────────

export interface PrepQuestion {
  id: string;
  question: string;
  tip: string;
  framework?: string;
  skeleton?: string[];
  dos?: string[];
  donts?: string[];
  tags?: string[];
  difficulty?: 'entry' | 'mid' | 'senior';
}

interface PersonalizationContext {
  parsedJD: IParsedJD | null;
  userSkills: string[];
  experienceYears: number;
  visaStatus?: string | null;
  companyName: string | null;
  jobTitle: string | null;
}

// ─── HR Questions ────────────────────────────────────────────────────────────

function getHRQuestions(ctx: PersonalizationContext): PrepQuestion[] {
  const qs: PrepQuestion[] = [
    {
      id: 'hr-tell-me',
      question: 'Tell me about yourself.',
      tip: 'Structure: Current role → key achievement → why this company. Keep it under 90 seconds.',
      skeleton: [
        `I'm currently a [role] at [company] where I [key responsibility].`,
        `One thing I'm proud of is [specific achievement with metric].`,
        `I'm excited about ${ctx.companyName || 'this role'} because [specific reason tied to company/role].`,
      ],
      dos: ['Be concise (60-90 seconds)', 'Lead with most relevant experience', 'End with why this company'],
      donts: ['Recite your entire resume', 'Start with personal life details', 'Be vague about achievements'],
    },
    {
      id: 'hr-why-role',
      question: ctx.companyName
        ? `Why are you interested in the ${ctx.jobTitle || 'this'} role at ${ctx.companyName}?`
        : 'Why are you interested in this role?',
      tip: ctx.companyName
        ? `Research ${ctx.companyName}'s mission, recent news, and products. Connect your skills to their specific needs.`
        : 'Connect your skills to the job description. Reference specific requirements you match.',
      skeleton: [
        `I've been following ${ctx.companyName || 'the company'} because [specific thing you admire].`,
        'This role appeals to me because [matches your career goals].',
        `My experience in [skill] directly maps to [JD requirement].`,
      ],
      dos: ['Reference specific company initiatives', 'Show you read the JD', 'Connect to your growth trajectory'],
      donts: ['Say "I just need a job"', 'Be generic', 'Only talk about compensation'],
    },
    {
      id: 'hr-why-leaving',
      question: 'Why are you leaving your current role?',
      tip: 'Stay positive. Focus on growth opportunities, not complaints.',
      skeleton: [
        'I\'ve learned a lot at [current company], particularly in [skill].',
        'I\'m looking for [specific growth opportunity] that aligns with my career goals.',
        `${ctx.companyName || 'This company'} offers exactly that because [reason].`,
      ],
      dos: ['Stay positive', 'Focus on growth', 'Show gratitude for current role'],
      donts: ['Complain about your manager', 'Mention politics or drama', 'Sound desperate to leave'],
    },
    {
      id: 'hr-salary',
      question: 'What are your salary expectations?',
      tip: 'Research the range first. Give a range, not a number. Anchor high within reason.',
      skeleton: [
        'Based on my research and experience level, I\'m looking at [range].',
        'But I\'m flexible — I\'d like to understand the full compensation picture.',
        'What\'s the range you\'ve budgeted for this role?',
      ],
      dos: ['Research on Levels.fyi / Glassdoor first', 'Give a range (not a single number)', 'Ask about total comp'],
      donts: ['Anchor too low', 'Say "whatever you think is fair"', 'Discuss current salary if not required'],
    },
    {
      id: 'hr-5-years',
      question: 'Where do you see yourself in 5 years?',
      tip: 'Show ambition aligned with the company. Mention skills you want to develop.',
      dos: ['Align with company growth path', 'Show you want to grow, not leave'],
      donts: ['Say "your job"', 'Be unrealistic', 'Show no ambition'],
    },
    {
      id: 'hr-weakness',
      question: 'What is your biggest weakness?',
      tip: 'Choose a real weakness you are actively improving. Show self-awareness + action.',
      framework: 'Weakness + Context + Action',
      skeleton: [
        'One area I\'ve been working on is [real weakness].',
        'I noticed it when [specific situation].',
        'I\'ve been addressing it by [concrete action].',
      ],
      dos: ['Be genuine', 'Show self-awareness', 'Emphasize improvement actions'],
      donts: ['Say "I work too hard"', 'Pick a critical skill for the role', 'Say you have no weaknesses'],
    },
    {
      id: 'hr-questions',
      question: 'Do you have any questions for us?',
      tip: 'Always ask 2-3 thoughtful questions about team culture, growth, or current challenges.',
      skeleton: [
        '"What does the first 90 days look like for this role?"',
        '"What are the biggest challenges the team is facing right now?"',
        '"How does the team approach [relevant topic from JD]?"',
      ],
      dos: ['Prepare 4-5 questions (some may get answered)', 'Ask about the role, not just perks'],
      donts: ['Say "no, I\'m good"', 'Only ask about PTO and benefits'],
    },
  ];

  // Visa-specific question
  if (ctx.visaStatus && ctx.visaStatus !== 'citizen' && ctx.visaStatus !== 'green_card') {
    const visaLabel = ctx.visaStatus === 'h1b' ? 'H-1B' : ctx.visaStatus === 'opt' ? 'OPT' : ctx.visaStatus === 'stem_opt' ? 'STEM OPT' : ctx.visaStatus;
    qs.splice(4, 0, {
      id: 'hr-visa',
      question: 'What is your work authorization status?',
      tip: `Present your ${visaLabel} status positively. Focus on your legal right to work and timeline.`,
      skeleton: [
        `I'm currently authorized to work in the US under ${visaLabel}.`,
        'I\'m fully eligible to work and my authorization is [valid through date / renewable].',
        'I\'m happy to discuss specifics with your HR team.',
      ],
      dos: ['Be confident and factual', 'Know your exact dates', 'Emphasize you can start on time'],
      donts: ['Apologize for your status', 'Bring it up before they ask', 'Be vague about timeline'],
      tags: ['visa', ctx.visaStatus],
    });
  }

  return qs;
}

// ─── Behavioral Questions ────────────────────────────────────────────────────

function getBehavioralQuestions(ctx: PersonalizationContext): PrepQuestion[] {
  const base: PrepQuestion[] = [
    {
      id: 'beh-lead-project',
      question: 'Tell me about a time you led a project from start to finish.',
      tip: 'Emphasize planning, delegation, overcoming obstacles, and measurable outcomes.',
      framework: 'STAR',
      skeleton: ['Situation: [context]', 'Task: [your responsibility]', 'Action: [specific steps]', 'Result: [measurable outcome]'],
      difficulty: 'mid',
    },
    {
      id: 'beh-learn-fast',
      question: 'Describe a situation where you had to learn something quickly.',
      tip: 'Show intellectual curiosity. Mention specific resources and how fast you became productive.',
      framework: 'STAR',
      difficulty: 'entry',
    },
    {
      id: 'beh-above-beyond',
      question: 'Give an example of when you went above and beyond.',
      tip: 'Pick something that genuinely exceeded expectations, not just doing your job well.',
      framework: 'STAR',
      difficulty: 'entry',
    },
    {
      id: 'beh-failure',
      question: 'Tell me about a time you failed.',
      tip: 'Be honest about the failure. Focus 70% on what you learned and changed.',
      framework: 'STAR',
      dos: ['Own the mistake', 'Focus on lessons learned', 'Show changed behavior'],
      donts: ['Blame others', 'Pick a trivial example', 'Say you never fail'],
      difficulty: 'mid',
    },
    {
      id: 'beh-priorities',
      question: 'How do you handle competing priorities?',
      tip: 'Show a framework: urgency vs importance, stakeholder communication, time-boxing.',
      framework: 'STAR',
      difficulty: 'mid',
    },
    {
      id: 'beh-influence',
      question: 'Describe a time you influenced without authority.',
      tip: 'Show empathy, data-driven persuasion, and building consensus across teams.',
      framework: 'STAR',
      difficulty: 'senior',
    },
    {
      id: 'beh-feedback',
      question: 'Tell me about receiving critical feedback.',
      tip: 'Show you seek feedback proactively. Describe concrete changes you made.',
      framework: 'STAR',
      difficulty: 'entry',
    },
    {
      id: 'beh-ambiguity',
      question: 'How do you approach ambiguous problems?',
      tip: 'Show structured thinking: define constraints, identify stakeholders, break into sub-problems, iterate.',
      framework: 'STAR',
      difficulty: 'senior',
    },
  ];

  // JD-specific behavioral question
  if (ctx.parsedJD?.responsibilities?.length) {
    const resp = ctx.parsedJD.responsibilities[0];
    base.push({
      id: 'beh-jd-resp',
      question: `Tell me about your experience with: "${resp}"`,
      tip: `This is directly from the ${ctx.companyName || ''} job description. Use a concrete STAR example.`,
      framework: 'STAR',
      tags: ['jd-specific'],
      difficulty: 'mid',
    });
  }

  // Sort by experience level match
  const level: PrepQuestion['difficulty'] =
    ctx.experienceYears <= 2 ? 'entry' : ctx.experienceYears <= 6 ? 'mid' : 'senior';

  return base.sort((a, b) => {
    const aMatch = a.difficulty === level ? 0 : 1;
    const bMatch = b.difficulty === level ? 0 : 1;
    return aMatch - bMatch;
  });
}

// ─── Technical Questions (JD-driven) ─────────────────────────────────────────

function getTechnicalQuestions(ctx: PersonalizationContext): PrepQuestion[] {
  const qs: PrepQuestion[] = [];

  // JD skill questions
  if (ctx.parsedJD?.required_skills?.length) {
    ctx.parsedJD.required_skills.slice(0, 4).forEach((skill, i) => {
      qs.push({
        id: `tech-skill-${i}`,
        question: `Describe your experience with ${skill}. How have you used it in production?`,
        tip: 'Use a specific project example. Mention scale, tradeoffs, and measurable outcomes.',
        tags: [skill],
        difficulty: 'mid',
      });
    });
  }

  qs.push({
    id: 'tech-sys-design',
    question: ctx.jobTitle
      ? `Design a simplified version of a system relevant to the ${ctx.jobTitle} role.`
      : 'Walk me through a system you designed.',
    tip: 'Start with requirements, then architecture decisions, tradeoffs, and results.',
    framework: 'Requirements → High-level → Deep dive → Tradeoffs',
    skeleton: [
      'Clarify requirements: functional + non-functional',
      'High-level architecture: major components and data flow',
      'Deep dive into 1-2 critical components',
      'Discuss tradeoffs and scalability',
    ],
    difficulty: 'senior',
  });

  qs.push({
    id: 'tech-coding',
    question: 'How do you approach a coding problem you haven\'t seen before?',
    tip: 'Think aloud, clarify requirements, start with brute force, then optimize.',
    skeleton: [
      'Ask clarifying questions about input/output/constraints',
      'Think of brute force approach first',
      'Identify the optimization (pattern, data structure)',
      'Code it up, then test with edge cases',
    ],
    difficulty: 'entry',
  });

  qs.push({
    id: 'tech-incident',
    question: 'How do you handle a production incident?',
    tip: 'Show a structured approach: assess, communicate, fix, postmortem.',
    difficulty: 'mid',
  });

  if (ctx.companyName) {
    qs.push({
      id: 'tech-product',
      question: `What would you improve about ${ctx.companyName}'s product?`,
      tip: 'Use their product beforehand. Give a specific, thoughtful suggestion with technical reasoning.',
      tags: ['company-specific'],
      difficulty: 'mid',
    });
  }

  // Generic DS&A fallback if no JD skills
  if (!ctx.parsedJD?.required_skills?.length) {
    qs.push(
      { id: 'tech-ds-arrays', question: 'Explain the sliding window pattern and when you\'d use it.', tip: 'Cover: when to use, time complexity, example problem.', tags: ['arrays'], difficulty: 'entry' },
      { id: 'tech-ds-trees', question: 'When would you use BFS vs DFS?', tip: 'BFS for shortest path / level-order, DFS for exhaustive search.', tags: ['trees'], difficulty: 'entry' },
      { id: 'tech-ds-hash', question: 'Explain hash map internals and when collisions become a problem.', tip: 'Hashing, buckets, chaining vs open addressing, O(1) avg vs O(n) worst.', tags: ['hash maps'], difficulty: 'mid' },
    );
  }

  return qs;
}

// ─── Offer Questions ─────────────────────────────────────────────────────────

function getOfferQuestions(ctx: PersonalizationContext): PrepQuestion[] {
  return [
    {
      id: 'offer-never-accept',
      question: 'Should I accept the first offer?',
      tip: 'Almost never. Companies expect negotiation.',
      dos: ['Express enthusiasm first', 'Ask for time to review', 'Counter with data'],
      donts: ['Accept immediately', 'Give an ultimatum', 'Lie about competing offers'],
    },
    {
      id: 'offer-market-value',
      question: 'How do I determine my market value?',
      tip: 'Use Levels.fyi, Glassdoor, and Blind. Filter by role, level, location.',
      skeleton: [
        'Research 3-5 data points on Levels.fyi for your exact role + level',
        'Cross-reference with Glassdoor and Blind',
        'Factor in location cost-of-living',
        'Consider total comp: base + equity + bonus + benefits',
      ],
    },
    {
      id: 'offer-total-comp',
      question: 'What should I negotiate beyond base salary?',
      tip: 'Equity/RSU, signing bonus, annual bonus, PTO, remote flexibility, learning budget, title.',
      dos: ['Negotiate the total package', 'Prioritize what matters most', 'Get everything in writing'],
      donts: ['Focus only on base', 'Forget equity vesting schedule', 'Ignore benefits value'],
    },
    {
      id: 'offer-competing',
      question: 'How do I use competing offers as leverage?',
      tip: 'Be transparent about timelines. The existence of alternatives is enough.',
      dos: ['Mention you have other processes', 'Be honest about timelines', 'Express genuine preference'],
      donts: ['Fabricate offers', 'Share exact competing numbers', 'Use aggressive tactics'],
    },
    {
      id: 'offer-counter',
      question: 'How do I structure a counter-offer?',
      tip: 'Lead with enthusiasm, present data, make a specific ask.',
      skeleton: [
        '"Thank you for the offer — I\'m excited about the opportunity."',
        '"Based on my research and the scope of this role, I was expecting closer to [X]."',
        '"Is there flexibility on [specific component]?"',
      ],
    },
    { id: 'offer-time', question: 'How much time should I ask for?', tip: 'Request at least 1 week. This is standard.' },
    { id: 'offer-trajectory', question: 'How should I factor in company trajectory?', tip: 'Lower base at faster-growing company may yield better comp in 2-3 years. Consider stage, funding, equity upside.' },
  ];
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function getPersonalizedQuestions(stage: PrepStage, ctx: PersonalizationContext): PrepQuestion[] {
  switch (stage) {
    case 'hr': return getHRQuestions(ctx);
    case 'behavioral': return getBehavioralQuestions(ctx);
    case 'technical': return getTechnicalQuestions(ctx);
    case 'offer': return getOfferQuestions(ctx);
    default: return getHRQuestions(ctx);
  }
}

// ─── Mock interview prompt builder (server-side) ─────────────────────────────

export function buildMockInterviewPrompt(
  stage: PrepStage,
  jobTitle: string,
  companyName: string,
  parsedJD: IParsedJD | null,
  questionNumber: number,
  action: 'start' | 'respond',
): string {
  const persona = stage === 'hr' ? 'HR recruiter' : stage === 'technical' ? 'senior software engineer' : stage === 'behavioral' ? 'hiring manager' : 'talent acquisition lead';
  const skills = parsedJD?.required_skills?.join(', ') || 'general skills';
  const responsibilities = parsedJD?.responsibilities?.slice(0, 3).join('; ') || '';

  if (action === 'start') {
    return `You are a ${persona} at ${companyName} conducting a mock ${stage} interview for a ${jobTitle} position.

Role context:
- Required skills: ${skills}
- Key responsibilities: ${responsibilities}

Ask the first interview question. Be conversational but professional. Ask ONE question only.
For HR: start with "tell me about yourself" style.
For technical: start with a relevant technical concept question.
For behavioral: start with a common behavioral question using STAR.

Respond with ONLY the question text, no meta-commentary.`;
  }

  return `You are a ${persona} at ${companyName} conducting a mock ${stage} interview for a ${jobTitle} position. This is question ${questionNumber} of 5.

Required skills: ${skills}
Key responsibilities: ${responsibilities}

The candidate just answered your question. Provide:
1. Brief, constructive feedback on their answer
2. A follow-up or next question (if question ${questionNumber} < 5)

Respond ONLY with JSON:
{
  "feedback_text": "Your brief feedback here (2-3 sentences, constructive tone)",
  "feedback": {
    "clarity": <1-5>,
    "relevance": <1-5>,
    "structure": <1-5>,
    "overall": <1-5>,
    "strengths": ["strength1", "strength2"],
    "improvements": ["improvement1"]
  },
  "next_question": "Your next interview question" or null if this is question 5,
  "session_complete": ${questionNumber >= 5}
}`;
}

// ─── AI generation (existing, kept for backward compat) ──────────────────────

export interface PrepResult {
  topics: string[];
  questions: Array<{ question: string; tip: string }>;
  resources: string[];
}

export async function generateInterviewPrep(
  prepType: PrepStage, jobTitle: string, companyName: string,
  parsedJD: IParsedJD, userExperienceYears: number, visaStatus?: string | null
): Promise<PrepResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallbackPrep(prepType, jobTitle, parsedJD, visaStatus);

  const typeInstructions: Record<PrepStage, string> = {
    hr: `Generate HR screening interview prep. Include questions about: background, why this company, salary expectations, and ${visaStatus ? 'visa positioning (' + visaStatus + ')' : 'career goals'}.`,
    technical: `Generate technical interview prep for required skills: ${parsedJD.required_skills.join(', ')}.`,
    behavioral: `Generate behavioral prep using STAR for: ${parsedJD.responsibilities.slice(0, 3).join('; ')}.`,
    offer: `Generate offer negotiation prep for ${jobTitle} at ${companyName}.`,
  };

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', max_tokens: 2000,
        messages: [{ role: 'user', content: `${typeInstructions[prepType]}\n\nJob: ${jobTitle} at ${companyName}\nSkills: ${parsedJD.required_skills.join(', ')}\nExperience: ${userExperienceYears} years\n\nRespond ONLY with JSON: { "topics": [...], "questions": [{"question":"...","tip":"..."}], "resources": [...] }` }],
      }),
    });
    const data = await response.json();
    return JSON.parse((data.content?.[0]?.text || '').replace(/```json|```/g, '').trim());
  } catch {
    return fallbackPrep(prepType, jobTitle, parsedJD, visaStatus);
  }
}

function fallbackPrep(type: PrepStage, _title: string, jd: IParsedJD, visa?: string | null): PrepResult {
  const m: Record<PrepStage, PrepResult> = {
    hr: { topics: ['Company research', 'Motivation', 'Salary'], questions: [{ question: 'Tell me about yourself.', tip: 'Keep it under 2 minutes.' }, ...(visa ? [{ question: 'Work authorization?', tip: `Present ${visa} positively.` }] : [])], resources: ['Glassdoor'] },
    technical: { topics: jd.required_skills.slice(0, 6), questions: [{ question: `Experience with ${jd.required_skills[0] || 'the stack'}?`, tip: 'Use project examples.' }], resources: ['LeetCode'] },
    behavioral: { topics: ['Leadership', 'Conflict', 'Problem solving'], questions: [{ question: 'Time you disagreed with a teammate.', tip: 'STAR method.' }], resources: ['STAR practice'] },
    offer: { topics: ['Salary negotiation', 'Equity'], questions: [{ question: 'The offer is $X. Thoughts?', tip: 'Never accept immediately.' }], resources: ['Levels.fyi'] },
  };
  return m[type];
}