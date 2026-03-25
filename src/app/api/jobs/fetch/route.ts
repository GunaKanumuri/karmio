import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// ─── Company ATS boards to scrape ───
// These are real, public API endpoints. No auth required.
const GREENHOUSE_COMPANIES = [
  'stripe', 'airbnb', 'figma', 'notion', 'plaid', 'gusto', 'coinbase',
  'brex', 'ramp', 'flexport', 'airtable', 'databricks', 'hashicorp',
  'duolingo', 'discord', 'reddit', 'snyk', 'vercel', 'retool', 'dbt-labs',
  'anduril', 'palantir', 'datadog', 'cloudflare', 'twilio',
];

const LEVER_COMPANIES = [
  'netflix', 'spotify', 'robinhood', 'yelp', 'lyft', 'instacart',
  'openai', 'anthropic', 'mistral', 'scale-ai', 'huggingface',
];

// ─── Types ───
interface RawJob {
  company_name: string;
  title: string;
  description_raw: string;
  location: string;
  remote_type: 'onsite' | 'hybrid' | 'remote';
  source_url: string;
  source_type: 'greenhouse' | 'lever';
  ats_board_url: string;
  country: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  experience_years_min: number | null;
  experience_years_max: number | null;
}

// ─── Security: require a secret to trigger ───
const CRON_SECRET = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: NextRequest) {
  try {
    // Verify caller is authorized (cron or admin)
    const authHeader = req.headers.get('authorization');
    const body = await req.json().catch(() => ({}));
    const secret = authHeader?.replace('Bearer ', '') || body.secret;

    if (CRON_SECRET && secret !== CRON_SECRET) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid cron secret.' } }, { status: 401 });
    }

    const supabase = createAdminClient();
    const results = { fetched: 0, new_jobs: 0, updated: 0, errors: 0, sources: [] as string[] };

    // ─── Fetch from Greenhouse boards ───
    for (const company of GREENHOUSE_COMPANIES) {
      try {
        const jobs = await fetchGreenhouseJobs(company);
        results.fetched += jobs.length;
        const upserted = await upsertJobs(supabase, jobs);
        results.new_jobs += upserted.new;
        results.updated += upserted.updated;
        results.sources.push(`greenhouse:${company}(${jobs.length})`);
      } catch (err) {
        results.errors++;
        console.error(`Greenhouse fetch failed for ${company}:`, err);
      }
    }

    // ─── Fetch from Lever boards ───
    for (const company of LEVER_COMPANIES) {
      try {
        const jobs = await fetchLeverJobs(company);
        results.fetched += jobs.length;
        const upserted = await upsertJobs(supabase, jobs);
        results.new_jobs += upserted.new;
        results.updated += upserted.updated;
        results.sources.push(`lever:${company}(${jobs.length})`);
      } catch (err) {
        results.errors++;
        console.error(`Lever fetch failed for ${company}:`, err);
      }
    }

    // ─── Mark stale jobs ───
    // Jobs not seen in 14 days → mark inactive
    const staleDate = new Date(Date.now() - 14 * 86400000).toISOString();
    const { data: staleData } = await supabase
      .from('job_postings')
      .update({ is_active: false })
      .eq('is_active', true)
      .lt('last_seen_at', staleDate)
      .select('id');

    return NextResponse.json({
      success: true,
      data: {
        ...results,
        stale_deactivated: staleData?.length || 0,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Job fetch cron error:', err);
    return NextResponse.json({
      success: false,
      error: { code: 'CRON_FAILED', message: 'Job fetch failed. Check logs.' },
    }, { status: 500 });
  }
}

// Also support GET for health checks from Vercel Cron
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'job-fetcher', method: 'Use POST to trigger fetch' });
}

// ═══════════════════════════════════════════════════════
// GREENHOUSE FETCHER
// API docs: https://developers.greenhouse.io/job-board.html
// ═══════════════════════════════════════════════════════
async function fetchGreenhouseJobs(boardToken: string): Promise<RawJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });

  if (!res.ok) {
    if (res.status === 404) return []; // Company board doesn't exist
    throw new Error(`Greenhouse ${boardToken}: HTTP ${res.status}`);
  }

  const data = await res.json();
  const jobs: RawJob[] = [];

  for (const job of (data.jobs || [])) {
    const location = job.location?.name || 'Unknown';
    const descriptionHtml = job.content || '';
    const descriptionText = stripHtml(descriptionHtml);
    const parsed = parseJobMetadata(descriptionText, job.title, location);

    jobs.push({
      company_name: formatCompanyName(boardToken),
      title: job.title,
      description_raw: descriptionText.slice(0, 10000),
      location: location,
      remote_type: detectRemoteType(location, job.title, descriptionText),
      source_url: job.absolute_url || `https://boards.greenhouse.io/${boardToken}/jobs/${job.id}`,
      source_type: 'greenhouse',
      ats_board_url: `https://boards.greenhouse.io/${boardToken}`,
      country: detectCountry(location),
      salary_min: parsed.salary_min,
      salary_max: parsed.salary_max,
      salary_currency: parsed.salary_currency,
      experience_years_min: parsed.experience_min,
      experience_years_max: parsed.experience_max,
    });
  }

  return jobs;
}

// ═══════════════════════════════════════════════════════
// LEVER FETCHER
// API docs: https://github.com/lever/postings-api
// ═══════════════════════════════════════════════════════
async function fetchLeverJobs(company: string): Promise<RawJob[]> {
  const url = `https://api.lever.co/v0/postings/${company}?mode=json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });

  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`Lever ${company}: HTTP ${res.status}`);
  }

  const data = await res.json();
  const jobs: RawJob[] = [];

  for (const posting of (Array.isArray(data) ? data : [])) {
    const location = posting.categories?.location || 'Unknown';
    const descriptionHtml = posting.descriptionPlain || posting.description || '';
    const descriptionText = stripHtml(descriptionHtml);
    const parsed = parseJobMetadata(descriptionText, posting.text, location);

    jobs.push({
      company_name: formatCompanyName(company),
      title: posting.text,
      description_raw: descriptionText.slice(0, 10000),
      location: location,
      remote_type: detectRemoteType(location, posting.text, descriptionText),
      source_url: posting.hostedUrl || posting.applyUrl || `https://jobs.lever.co/${company}/${posting.id}`,
      source_type: 'lever',
      ats_board_url: `https://jobs.lever.co/${company}`,
      country: detectCountry(location),
      salary_min: parsed.salary_min,
      salary_max: parsed.salary_max,
      salary_currency: parsed.salary_currency,
      experience_years_min: parsed.experience_min,
      experience_years_max: parsed.experience_max,
    });
  }

  return jobs;
}

// ═══════════════════════════════════════════════════════
// UPSERT — dedup by hash, update last_seen_at on conflicts
// ═══════════════════════════════════════════════════════
async function upsertJobs(supabase: any, jobs: RawJob[]): Promise<{ new: number; updated: number }> {
  if (jobs.length === 0) return { new: 0, updated: 0 };

  let newCount = 0;
  let updatedCount = 0;

  // Process in batches of 50
  for (let i = 0; i < jobs.length; i += 50) {
    const batch = jobs.slice(i, i + 50);
    const rows = batch.map(job => {
      const dedupHash = generateDedupHash(job.company_name, job.title, job.location);
      const realnessScore = computeRealnessScore(job);

      return {
        company_name: job.company_name,
        title: job.title,
        description_raw: job.description_raw,
        description_parsed: parseJD(job.description_raw, job.title),
        location: job.location,
        remote_type: job.remote_type,
        source_url: job.source_url,
        source_type: job.source_type,
        ats_board_url: job.ats_board_url,
        dedup_hash: dedupHash,
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        is_active: true,
        realness_score: realnessScore,
        sponsorship_status: detectSponsorship(job.description_raw),
        experience_years_min: job.experience_years_min,
        experience_years_max: job.experience_years_max,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        salary_currency: job.salary_currency || 'USD',
        country: job.country,
      };
    });

    // Upsert — on conflict update last_seen_at and is_active
    const { data, error } = await supabase
      .from('job_postings')
      .upsert(rows, {
        onConflict: 'dedup_hash',
        ignoreDuplicates: false,
      })
      .select('id, created_at, last_seen_at');

    if (error) {
      console.error('Batch upsert error:', error.message);
      continue;
    }

    // Count new vs updated
    for (const row of (data || [])) {
      const createdAt = new Date(row.created_at).getTime();
      const lastSeen = new Date(row.last_seen_at).getTime();
      // If created_at and last_seen_at are within 2 seconds, it's new
      if (Math.abs(createdAt - lastSeen) < 2000) {
        newCount++;
      } else {
        updatedCount++;
      }
    }
  }

  return { new: newCount, updated: updatedCount };
}

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

function generateDedupHash(company: string, title: string, location: string): string {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  const input = `${normalize(company)}|${normalize(title)}|${normalize(location)}`;
  // Simple hash — not crypto-grade, but deterministic and fast
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit int
  }
  // Convert to hex string and pad
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  // Add more entropy from the input length and first chars
  const extra = (input.length * 31 + input.charCodeAt(0) * 17).toString(16).padStart(8, '0');
  return `${hex}${extra}${input.length.toString(16).padStart(4, '0')}`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|li|h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatCompanyName(slug: string): string {
  const overrides: Record<string, string> = {
    'dbt-labs': 'dbt Labs', 'openai': 'OpenAI', 'huggingface': 'Hugging Face',
    'scale-ai': 'Scale AI', 'hashicorp': 'HashiCorp',
  };
  return overrides[slug] || slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function detectRemoteType(location: string, title: string, description: string): 'remote' | 'hybrid' | 'onsite' {
  const text = `${location} ${title} ${description}`.toLowerCase();
  if (text.includes('remote') && !text.includes('hybrid')) return 'remote';
  if (text.includes('hybrid')) return 'hybrid';
  return 'onsite';
}

function detectCountry(location: string): string {
  const loc = location.toLowerCase();
  if (loc.includes('india') || loc.includes('bangalore') || loc.includes('bengaluru') ||
    loc.includes('mumbai') || loc.includes('hyderabad') || loc.includes('delhi') ||
    loc.includes('pune') || loc.includes('chennai') || loc.includes('gurgaon') ||
    loc.includes('noida')) return 'IN';
  return 'US'; // Default to US
}

function detectSponsorship(description: string): 'yes' | 'no' | 'unknown' {
  const text = description.toLowerCase();
  if (text.includes('visa sponsorship') && !text.includes('no visa') && !text.includes('not sponsor') &&
    !text.includes('unable to sponsor') && !text.includes('cannot sponsor')) return 'yes';
  if (text.includes('no visa') || text.includes('not sponsor') || text.includes('unable to sponsor') ||
    text.includes('cannot sponsor') || text.includes('must be authorized') ||
    text.includes('must be eligible')) return 'no';
  return 'unknown';
}

function computeRealnessScore(job: RawJob): number {
  let score = 50; // Base score

  // Source reliability (Greenhouse/Lever are high quality)
  if (job.source_type === 'greenhouse') score += 25;
  else if (job.source_type === 'lever') score += 23;

  // Specificity — longer descriptions are more real
  if (job.description_raw.length > 500) score += 10;
  if (job.description_raw.length > 1500) score += 5;

  // Has salary info
  if (job.salary_min && job.salary_max) score += 5;

  // Has experience requirements
  if (job.experience_years_min !== null) score += 5;

  return Math.min(100, score);
}

function parseJobMetadata(text: string, title: string, location: string) {
  let salary_min: number | null = null;
  let salary_max: number | null = null;
  let salary_currency = 'USD';
  let experience_min: number | null = null;
  let experience_max: number | null = null;

  // Salary parsing: $120,000 - $180,000 or $120K-$180K
  const salaryMatch = text.match(/\$\s*([\d,]+)(?:k|K)?\s*[-–to]+\s*\$?\s*([\d,]+)(?:k|K)?/);
  if (salaryMatch) {
    let min = parseInt(salaryMatch[1].replace(/,/g, ''));
    let max = parseInt(salaryMatch[2].replace(/,/g, ''));
    if (min < 1000) min *= 1000; // Handle $120K format
    if (max < 1000) max *= 1000;
    salary_min = min;
    salary_max = max;
  }

  // INR salary: ₹12 LPA or Rs.12-18 LPA
  const inrMatch = text.match(/(?:₹|Rs\.?)\s*([\d.]+)\s*[-–to]*\s*([\d.]+)?\s*(?:LPA|lpa|Lakhs)/);
  if (inrMatch) {
    salary_min = Math.round(parseFloat(inrMatch[1]) * 100000);
    salary_max = inrMatch[2] ? Math.round(parseFloat(inrMatch[2]) * 100000) : salary_min;
    salary_currency = 'INR';
  }

  // Experience: 3+ years, 3-5 years, minimum 3 years
  const expMatch = text.match(/(\d+)\+?\s*(?:[-–to]+\s*(\d+))?\s*years?\s*(?:of\s*)?(?:experience|exp)/i);
  if (expMatch) {
    experience_min = parseInt(expMatch[1]);
    experience_max = expMatch[2] ? parseInt(expMatch[2]) : null;
  }

  return { salary_min, salary_max, salary_currency, experience_min, experience_max };
}

function parseJD(text: string, title: string): any {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Extract skills
  const skillKeywords = [
    'javascript', 'typescript', 'python', 'java', 'c++', 'go', 'rust', 'ruby', 'swift', 'kotlin',
    'react', 'angular', 'vue', 'next.js', 'node.js', 'express', 'django', 'flask', 'spring',
    'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
    'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'terraform',
    'git', 'ci/cd', 'graphql', 'rest', 'grpc', 'kafka', 'rabbitmq',
    'machine learning', 'deep learning', 'pytorch', 'tensorflow', 'pandas', 'numpy',
    'figma', 'sketch', 'adobe', 'css', 'tailwind', 'sass',
    'agile', 'scrum', 'product management', 'data analysis', 'a/b testing',
  ];

  const textLower = text.toLowerCase();
  const found = skillKeywords.filter(s => textLower.includes(s));

  // Parse experience years
  const expMatch = text.match(/(\d+)\+?\s*(?:[-–to]+\s*(\d+))?\s*years/i);

  return {
    required_skills: found.slice(0, 15),
    preferred_skills: [],
    responsibilities: [],
    education_requirements: textLower.includes('bachelor') || textLower.includes('degree') ? ['bachelor'] : [],
    experience_years: {
      min: expMatch ? parseInt(expMatch[1]) : 0,
      max: expMatch && expMatch[2] ? parseInt(expMatch[2]) : null,
    },
    keywords: [...found, ...title.toLowerCase().split(/\s+/).filter(w => w.length > 3)],
  };
}
