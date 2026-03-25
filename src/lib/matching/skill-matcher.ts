// Skill matcher — extracts and matches skills between JD and user profile
// Uses rule-based NLP (no AI needed — free forever)

const TECH_SKILLS_DB = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
  'react', 'angular', 'vue', 'next.js', 'node.js', 'express', 'django', 'flask', 'spring', 'rails',
  'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'firebase', 'supabase',
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ci/cd', 'jenkins', 'github actions',
  'rest api', 'graphql', 'grpc', 'websocket', 'microservices', 'distributed systems',
  'machine learning', 'deep learning', 'nlp', 'computer vision', 'tensorflow', 'pytorch',
  'sql', 'nosql', 'data analysis', 'data engineering', 'etl', 'spark', 'hadoop', 'tableau', 'power bi',
  'html', 'css', 'tailwind', 'sass', 'figma', 'sketch',
  'git', 'agile', 'scrum', 'jira', 'confluence',
  'linux', 'bash', 'networking', 'security', 'oauth', 'jwt',
];

export function extractSkillsFromText(text: string): string[] {
  const normalized = text.toLowerCase();
  const found: string[] = [];

  for (const skill of TECH_SKILLS_DB) {
    // Check for exact match or word boundary match
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(normalized) || normalized.includes(skill)) {
      found.push(skill);
    }
  }

  // Also extract skills from common patterns like "X years of Y"
  const patterns = [
    /experience (?:with|in|using) ([a-z\s.+#/]+?)(?:,|\.|and|;)/gi,
    /proficient in ([a-z\s.+#/]+?)(?:,|\.|and|;)/gi,
    /knowledge of ([a-z\s.+#/]+?)(?:,|\.|and|;)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const extracted = match[1].trim().toLowerCase();
      if (extracted.length > 2 && extracted.length < 30 && !found.includes(extracted)) {
        found.push(extracted);
      }
    }
  }

  return [...new Set(found)];
}

export function matchSkills(userSkills: string[], jdSkills: string[]): {
  matched: string[];
  missing: string[];
  extra: string[];
  score: number;
} {
  const normalize = (s: string) => s.toLowerCase().trim();
  const normalizedUser = userSkills.map(normalize);
  const normalizedJD = jdSkills.map(normalize);

  const matched = normalizedJD.filter(jd =>
    normalizedUser.some(us => us.includes(jd) || jd.includes(us) || levenshteinSimilar(us, jd))
  );
  const missing = normalizedJD.filter(jd => !matched.includes(jd));
  const extra = normalizedUser.filter(us =>
    !normalizedJD.some(jd => us.includes(jd) || jd.includes(us))
  );

  const score = normalizedJD.length > 0 ? Math.round((matched.length / normalizedJD.length) * 100) : 50;

  return { matched, missing, extra, score };
}

function levenshteinSimilar(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 3) return false;
  let dist = 0;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) dist++;
  }
  return dist <= 2 && len > 4;
}

export function parseExperienceYears(text: string): { min: number; max: number | null } {
  const patterns = [
    /(\d+)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*experience/i,
    /(\d+)\s*-\s*(\d+)\s*(?:years?|yrs?)/i,
    /minimum\s*(\d+)\s*(?:years?|yrs?)/i,
    /at least\s*(\d+)\s*(?:years?|yrs?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const min = parseInt(match[1]);
      const max = match[2] ? parseInt(match[2]) : null;
      return { min, max };
    }
  }

  return { min: 0, max: null };
}
