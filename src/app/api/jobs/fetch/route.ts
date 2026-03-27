import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateDedupHash } from '@/lib/matching/dedup-hash';
// =============================================================================
// KARMIO JOB FETCHER v2 — Dynamic Company Expansion
//
// Strategy: Instead of a static list of 36 companies, we use a three-phase
// approach:
//
// 1. SEED COMPANIES — High-priority curated companies we always check.
// 2. DYNAMIC DISCOVERY — We probe Greenhouse board slugs from a large pool
//    organized by department. Each 2-hour cron run rotates through departments.
//    Companies with valid boards get auto-registered in company_details.
// 3. RE-FETCH — Previously discovered companies with open roles get re-checked
//    on a rolling basis.
//
// After a few weeks of 2-hour cron runs, company count grows to thousands.
// =============================================================================

// --- Seed company registry (always checked every run) -----------------------
interface CompanyConfig {
  slug: string;
  name: string;
  ats: 'greenhouse' | 'lever';
  career_page_url: string;
}

const GREENHOUSE_SEED: CompanyConfig[] = [
  { slug: 'stripe',     name: 'Stripe',      ats: 'greenhouse', career_page_url: 'https://stripe.com/jobs' },
  { slug: 'airbnb',     name: 'Airbnb',      ats: 'greenhouse', career_page_url: 'https://careers.airbnb.com' },
  { slug: 'figma',      name: 'Figma',       ats: 'greenhouse', career_page_url: 'https://www.figma.com/careers' },
  { slug: 'notion',     name: 'Notion',      ats: 'greenhouse', career_page_url: 'https://www.notion.so/careers' },
  { slug: 'plaid',      name: 'Plaid',       ats: 'greenhouse', career_page_url: 'https://plaid.com/careers' },
  { slug: 'gusto',      name: 'Gusto',       ats: 'greenhouse', career_page_url: 'https://gusto.com/about/careers' },
  { slug: 'coinbase',   name: 'Coinbase',    ats: 'greenhouse', career_page_url: 'https://www.coinbase.com/careers' },
  { slug: 'brex',       name: 'Brex',        ats: 'greenhouse', career_page_url: 'https://www.brex.com/careers' },
  { slug: 'ramp',       name: 'Ramp',        ats: 'greenhouse', career_page_url: 'https://ramp.com/careers' },
  { slug: 'flexport',   name: 'Flexport',    ats: 'greenhouse', career_page_url: 'https://www.flexport.com/careers' },
  { slug: 'airtable',   name: 'Airtable',    ats: 'greenhouse', career_page_url: 'https://airtable.com/careers' },
  { slug: 'databricks', name: 'Databricks',  ats: 'greenhouse', career_page_url: 'https://www.databricks.com/company/careers' },
  { slug: 'hashicorp',  name: 'HashiCorp',   ats: 'greenhouse', career_page_url: 'https://www.hashicorp.com/jobs' },
  { slug: 'duolingo',   name: 'Duolingo',    ats: 'greenhouse', career_page_url: 'https://careers.duolingo.com' },
  { slug: 'discord',    name: 'Discord',     ats: 'greenhouse', career_page_url: 'https://discord.com/careers' },
  { slug: 'reddit',     name: 'Reddit',      ats: 'greenhouse', career_page_url: 'https://www.redditinc.com/careers' },
  { slug: 'snyk',       name: 'Snyk',        ats: 'greenhouse', career_page_url: 'https://snyk.io/careers' },
  { slug: 'vercel',     name: 'Vercel',      ats: 'greenhouse', career_page_url: 'https://vercel.com/careers' },
  { slug: 'retool',     name: 'Retool',      ats: 'greenhouse', career_page_url: 'https://retool.com/careers' },
  { slug: 'dbt-labs',   name: 'dbt Labs',    ats: 'greenhouse', career_page_url: 'https://www.getdbt.com/dbt-labs/open-roles' },
  { slug: 'anduril',    name: 'Anduril',     ats: 'greenhouse', career_page_url: 'https://www.anduril.com/open-roles' },
  { slug: 'palantir',   name: 'Palantir',    ats: 'greenhouse', career_page_url: 'https://www.palantir.com/careers' },
  { slug: 'datadog',    name: 'Datadog',     ats: 'greenhouse', career_page_url: 'https://careers.datadoghq.com' },
  { slug: 'cloudflare', name: 'Cloudflare',  ats: 'greenhouse', career_page_url: 'https://www.cloudflare.com/careers' },
  { slug: 'twilio',     name: 'Twilio',      ats: 'greenhouse', career_page_url: 'https://www.twilio.com/en-us/company/jobs' },
];

const LEVER_SEED: CompanyConfig[] = [
  { slug: 'netflix',     name: 'Netflix',      ats: 'lever', career_page_url: 'https://jobs.netflix.com' },
  { slug: 'spotify',     name: 'Spotify',      ats: 'lever', career_page_url: 'https://www.lifeatspotify.com/jobs' },
  { slug: 'robinhood',   name: 'Robinhood',    ats: 'lever', career_page_url: 'https://careers.robinhood.com' },
  { slug: 'yelp',        name: 'Yelp',         ats: 'lever', career_page_url: 'https://www.yelp.careers' },
  { slug: 'lyft',        name: 'Lyft',         ats: 'lever', career_page_url: 'https://www.lyft.com/careers' },
  { slug: 'instacart',   name: 'Instacart',    ats: 'lever', career_page_url: 'https://instacart.careers' },
  { slug: 'openai',      name: 'OpenAI',       ats: 'lever', career_page_url: 'https://openai.com/careers' },
  { slug: 'anthropic',   name: 'Anthropic',    ats: 'lever', career_page_url: 'https://www.anthropic.com/careers' },
  { slug: 'mistral',     name: 'Mistral AI',   ats: 'lever', career_page_url: 'https://mistral.ai/company/#careers' },
  { slug: 'scale-ai',    name: 'Scale AI',     ats: 'lever', career_page_url: 'https://scale.com/careers' },
  { slug: 'huggingface', name: 'Hugging Face', ats: 'lever', career_page_url: 'https://apply.workable.com/huggingface' },
];

// --- Dynamic discovery pool (organized by department) -----------------------
// Each cron run focuses on 1-2 departments and probes these Greenhouse slugs.
// If a board exists and returns jobs, the company is auto-registered.
const DISCOVERY_POOL: Record<string, string[]> = {
  engineering: [
    'mongodb','elastic','confluent','cockroachlabs','timescale','planetscale',
    'supabase','neon','turso','singlestore','yugabyte','clickhouse',
    'materialize','snowflake','fivetran','airbyte','prefect','dagster',
    'temporal','inngest','nango','merge','workos','clerk','stytch',
    'launchdarkly','statsig','eppo','posthog','mixpanel','amplitude',
    'sentry','honeycomb','grafana','cribl','circleci','buildkite',
    'tailscale','teleport','doppler','vanta','drata','semgrep',
    'chainguard','aquasecurity','gitpod','coder','linear','shortcut',
  ],
  devops: [
    'pulumi','env0','spacelift','harness','codefresh','earthly',
    'depot','netbird','twingate','strongdm','infisical','secureframe',
    'sonarqube','endorlabs','socket','anchore','buildkite','circleci',
    'spacelift','env0','atlantis','crossplane','upbound','komodor',
  ],
  data: [
    'fivetran','airbyte','starburst','tabular','tecton','anyscale',
    'modal','replicate','labelbox','snorkel','cleanlab','pinecone',
    'weaviate','qdrant','chroma','deepset','hex','mode','preset',
    'cube','lightdash','montecarlodata','metaplane','atlan','alation',
    'collibra','census','hightouch','rudderstack','segment','jitsu',
  ],
  design: [
    'canva','framer','webflow','sanity','contentful','strapi',
    'storyblok','miro','whimsical','lucid','pitch','lottiefiles',
    'spline','maze','usertesting','hotjar','smartlook','readymag',
    'plasmic','builderio','makeswift','hygraph','payload','contentstack',
  ],
  product: [
    'coda','clickup','linear','shortcut','height','productboard',
    'pendo','gainsight','appcues','whatfix','intercom','zendesk',
    'freshworks','helpscout','front','customerio','braze','iterable',
    'onesignal','attio','folk','clay','apollo','lusha',
  ],
  finance: [
    'mercury','carta','pulley','navan','airbase','bill','tipalti',
    'melio','moov','unit','column','lithic','marqeta','circle',
    'anchorage','fireblocks','chainalysis','trmlabs','found','relay',
  ],
  marketing: [
    'hubspot','sendgrid','resend','beehiiv','convertkit','buffer',
    'sproutsocial','loom','vidyard','synthesia','jasper','grammarly',
    'semrush','ahrefs','surfer','unbounce','optimizely','vwo',
  ],
  sales: [
    'gong','clari','outreach','salesloft','apollo','drift','qualified',
    'chilipiper','calendly','pandadoc','docusign','ironclad','highspot',
    'seismic','showpad','scratchpad','aviso','dealfront','warmly',
    'sixsense','demandbase','zoominfo','cognism','lusha',
  ],
  hr: [
    'rippling','deel','remote','oyster','lattice','cultureamp',
    'leapsome','lever','ashby','gem','brighthire','eightfold',
    'paradox','phenom','beamery','smartrecruiters','bamboohr','personio',
    'factorial','hibob','namely','justworks','trinet',
  ],
  operations: [
    'shippo','shipbob','easypost','project44','zapier','make',
    'workato','n8n','appsmith','tooljet','budibase','dronahq',
    'hevodata','rivery','trayio','retool','convex','supabase',
  ],
  security: [
    'crowdstrike','sentinelone','wiz','orca','lacework','sysdig',
    'okta','jumpcloud','beyondtrust','abnormalsecurity','tessian',
    'fortinetcloud','netskope','cybereason','trellix','sophos',
  ],
  ml: [
    'cohere','ai21','runway','pika','stability','together',
    'coreweave','lambda','anyscale','modal','replicate','wandb',
    'dagshub','llamaindex','langchain','guardrailsai','humanloop',
    'promptlayer','banana','descript','elevenlab','assemblyai',
  ],
  creative: [
    'canva','squarespace','wix','lottiefiles','spline','rive',
    'pitch','gamma','loom','descript','kapwing','veed',
  ],
  management: [
    'asana','monday','wrike','smartsheet','basecamp','notion',
    'gitlab','github','slack','loom','lattice','15five',
  ],
  growth: [
    'amplitude','mixpanel','heap','posthog','fullstory','split',
    'statsig','eppo','growthbook','appsflyer','branch','adjust',
    'revenuecat','clevertap','braze','customerio','iterable',
  ],
  legal: [
    'ironclad','juro','docusign','pandadoc','casetext','everlaw',
    'clio','smokeball','contractpodai','relativity','luminance',
  ],
  accounting: [
    'navan','airbase','bill','tipalti','melio','carta','pulley',
    'pilot','bench','digits','puzzle','zeni','ramp','brex',
  ],
};

// --- Types ------------------------------------------------------------------
interface RawJob {
  company_name: string;
  company_slug: string;
  title: string;
  description_raw: string;
  location: string;
  remote_type: 'onsite' | 'hybrid' | 'remote';
  source_url: string;
  source_type: 'greenhouse' | 'lever';
  ats_board_url: string;
  career_page_url: string;
  country: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  experience_years_min: number | null;
  experience_years_max: number | null;
}

interface CompanyStats {
  slug: string;
  totalRoles: number;
  engRoles: number;
  sponsorshipSignal: 'yes' | 'no' | 'unknown';
  sponsorshipNotes: string;
}

const CRON_SECRET = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Greenhouse slug -> board token overrides
const GH_SLUG_MAP: Record<string, string> = {
  'dbt-labs': 'dbtlabs', 'cockroachlabs': 'cockroachlabs', 'montecarlodata': 'montecarlodata',
  'abnormalsecurity': 'abnormalsecurity', 'builderio': 'builderio', 'customerio': 'customerio',
  'cultureamp': 'cultureamp', 'wandb': 'wandb', 'endorlabs': 'endorlabs',
  'sproutsocial': 'sproutsocial', 'sixsense': '6sense', 'fortinetcloud': 'fortinet',
  'elevenlab': 'elevenlabs', 'guardrailsai': 'guardrailsai',
};

// =============================================================================
// POST - Main fetch logic
// =============================================================================
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const authHeader = req.headers.get('authorization');
  const body = await req.json().catch(() => ({}));
  const secret = authHeader?.replace('Bearer ', '') || body.secret;

  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid cron secret.' } },
      { status: 401 }
    );
  }

  const supabase = createAdminClient();
  const focusDepartments: string[] = body.focus_departments || [];
  const results = {
    fetched: 0, new_jobs: 0, updated: 0, errors: 0,
    stale_deactivated: 0, companies_attempted: 0, companies_succeeded: 0,
    companies_discovered: 0, sources: [] as string[], error_details: [] as string[],
  };

  // =========================================================================
  // PHASE 1: Seed companies (always run)
  // =========================================================================
  for (const company of GREENHOUSE_SEED) {
    results.companies_attempted++;
    try {
      const { jobs, stats } = await fetchGreenhouseJobs(company);
      results.fetched += jobs.length;
      const u = await upsertJobs(supabase, jobs);
      results.new_jobs += u.new; results.updated += u.updated;
      results.companies_succeeded++;
      results.sources.push(`gh:${company.slug}(${jobs.length})`);
      await syncCompanyDetails(supabase, company, stats);
    } catch (err: any) {
      results.errors++;
      results.error_details.push(`gh:${company.slug}:${err.message}`);
    }
  }

  for (const company of LEVER_SEED) {
    results.companies_attempted++;
    try {
      const { jobs, stats } = await fetchLeverJobs(company);
      results.fetched += jobs.length;
      const u = await upsertJobs(supabase, jobs);
      results.new_jobs += u.new; results.updated += u.updated;
      results.companies_succeeded++;
      results.sources.push(`lv:${company.slug}(${jobs.length})`);
      await syncCompanyDetails(supabase, company, stats);
    } catch (err: any) {
      results.errors++;
      results.error_details.push(`lv:${company.slug}:${err.message}`);
    }
  }

  // =========================================================================
  // PHASE 2: Dynamic discovery from focused departments
  // =========================================================================
  if (focusDepartments.length > 0) {
    const pool = new Set<string>();
    for (const dept of focusDepartments) {
      for (const s of (DISCOVERY_POOL[dept] || [])) pool.add(s);
    }

    const seedSlugs = new Set([
      ...GREENHOUSE_SEED.map(c => c.slug),
      ...LEVER_SEED.map(c => c.slug),
    ]);
    const candidates = [...pool].filter(s => !seedSlugs.has(s));

    // Skip recently fetched (within 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
    const { data: recent } = await supabase
      .from('company_details')
      .select('company_slug')
      .in('company_slug', candidates.slice(0, 200))
      .gte('last_fetched_at', twoHoursAgo);

    const recentSet = new Set((recent || []).map(r => r.company_slug));
    const toProbe = candidates.filter(s => !recentSet.has(s)).slice(0, 40);

    for (const slug of toProbe) {
      results.companies_attempted++;
      const company: CompanyConfig = {
        slug, name: formatCompanyName(slug), ats: 'greenhouse',
        career_page_url: `https://boards.greenhouse.io/${GH_SLUG_MAP[slug] || slug}`,
      };

      try {
        const { jobs, stats } = await fetchGreenhouseJobs(company);
        if (jobs.length === 0) {
          await supabase.from('company_details').upsert({
            company_slug: slug, company_name: company.name, ats_type: 'greenhouse',
            career_page_url: company.career_page_url,
            ats_board_url: `https://boards.greenhouse.io/${GH_SLUG_MAP[slug] || slug}`,
            open_roles_count: 0, last_fetched_at: new Date().toISOString(),
            fetch_error: 'no_board_or_no_jobs',
          }, { onConflict: 'company_slug', ignoreDuplicates: false });
          continue;
        }
        results.fetched += jobs.length;
        const u = await upsertJobs(supabase, jobs);
        results.new_jobs += u.new; results.updated += u.updated;
        results.companies_succeeded++;
        results.companies_discovered++;
        results.sources.push(`disc:${slug}(${jobs.length})`);
        await syncCompanyDetails(supabase, company, stats);
      } catch (err: any) {
        results.errors++;
        results.error_details.push(`disc:${slug}:${err.message}`);
        await supabase.from('company_details').upsert({
          company_slug: slug, company_name: company.name, ats_type: 'greenhouse',
          career_page_url: company.career_page_url,
          ats_board_url: `https://boards.greenhouse.io/${GH_SLUG_MAP[slug] || slug}`,
          open_roles_count: 0, last_fetched_at: new Date().toISOString(),
          fetch_error: (err.message || '').slice(0, 200),
        }, { onConflict: 'company_slug', ignoreDuplicates: false });
      }
    }
  }

  // =========================================================================
  // PHASE 3: Re-fetch previously discovered companies (stale > 4 hours)
  // =========================================================================
  const seedSlugsAll = new Set([
    ...GREENHOUSE_SEED.map(c => c.slug), ...LEVER_SEED.map(c => c.slug),
  ]);
  const fourHoursAgo = new Date(Date.now() - 4 * 3600000).toISOString();
  const { data: staleCompanies } = await supabase
    .from('company_details')
    .select('company_slug, company_name, ats_type, career_page_url, ats_board_url')
    .gt('open_roles_count', 0)
    .lt('last_fetched_at', fourHoursAgo)
    .is('fetch_error', null)
    .order('last_fetched_at', { ascending: true })
    .limit(30);

  for (const row of (staleCompanies || [])) {
    if (seedSlugsAll.has(row.company_slug)) continue;
    results.companies_attempted++;
    const company: CompanyConfig = {
      slug: row.company_slug, name: row.company_name,
      ats: (row.ats_type || 'greenhouse') as 'greenhouse' | 'lever',
      career_page_url: row.career_page_url || row.ats_board_url || '',
    };
    try {
      const fetcher = company.ats === 'lever' ? fetchLeverJobs : fetchGreenhouseJobs;
      const { jobs, stats } = await fetcher(company);
      results.fetched += jobs.length;
      const u = await upsertJobs(supabase, jobs);
      results.new_jobs += u.new; results.updated += u.updated;
      results.companies_succeeded++;
      results.sources.push(`re:${company.slug}(${jobs.length})`);
      await syncCompanyDetails(supabase, company, stats);
    } catch (err: any) {
      results.errors++;
      results.error_details.push(`re:${company.slug}:${err.message}`);
    }
  }

  // =========================================================================
  // PHASE 4: Mark stale jobs inactive (7-day retention window)
  // =========================================================================
  const staleDate = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: staleData } = await supabase
    .from('job_postings')
    .update({ is_active: false })
    .eq('is_active', true)
    .lt('last_seen_at', staleDate)
    .select('id');
  results.stale_deactivated = staleData?.length || 0;

  // --- Audit log ---
  const durationMs = Date.now() - startTime;
  try {
    await supabase.from('job_fetch_log').insert({
      triggered_by: body.triggered_by || 'manual',
      companies_attempted: results.companies_attempted,
      companies_succeeded: results.companies_succeeded,
      jobs_fetched: results.fetched,
      jobs_new: results.new_jobs,
      jobs_updated: results.updated,
      jobs_stale_deactivated: results.stale_deactivated,
      duration_ms: durationMs,
      error_count: results.errors,
      errors: results.error_details.slice(0, 50),
      success: results.errors < results.companies_attempted,
      notes: `discovered=${results.companies_discovered} depts=[${(body.focus_departments || []).join(',')}]`,
    });
  } catch {}

  return NextResponse.json({
    success: true,
    data: {
      ...results,
      focus_departments: body.focus_departments || [],
      duration_ms: durationMs,
      timestamp: new Date().toISOString(),
    },
  });
}

// --- GET health check -------------------------------------------------------
export async function GET() {
  const unique = new Set(Object.values(DISCOVERY_POOL).flat()).size;
  return NextResponse.json({
    status: 'ok', endpoint: 'job-fetcher', schedule: 'every 2 hours (0 */2 * * *)',
    seed_companies: GREENHOUSE_SEED.length + LEVER_SEED.length,
    discovery_pool_unique: unique,
    departments: Object.keys(DISCOVERY_POOL),
  });
}

// =============================================================================
// GREENHOUSE FETCHER
// =============================================================================
async function fetchGreenhouseJobs(company: CompanyConfig): Promise<{ jobs: RawJob[]; stats: CompanyStats }> {
  const boardToken = GH_SLUG_MAP[company.slug] || company.slug;
  const url = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    if (res.status === 404) return { jobs: [], stats: emptyStats(company.slug) };
    throw new Error(`HTTP ${res.status}`);
  }
  const data = await res.json();
  const ats_board_url = `https://boards.greenhouse.io/${boardToken}`;
  const jobs: RawJob[] = [];
  for (const job of (data.jobs || [])) {
    const location = job.location?.name || 'Unknown';
    const desc = stripHtml(job.content || '');
    const parsed = parseJobMetadata(desc, job.title, location);
    jobs.push({
      company_name: company.name, company_slug: company.slug, title: job.title,
      description_raw: desc.slice(0, 10000), location,
      remote_type: detectRemoteType(location, job.title, desc),
      source_url: job.absolute_url || `${ats_board_url}/jobs/${job.id}`,
      source_type: 'greenhouse', ats_board_url,
      career_page_url: company.career_page_url,
      country: detectCountry(location),
      salary_min: parsed.salary_min, salary_max: parsed.salary_max,
      salary_currency: parsed.salary_currency,
      experience_years_min: parsed.experience_min, experience_years_max: parsed.experience_max,
    });
  }
  return { jobs, stats: computeCompanyStats(company.slug, jobs) };
}

// =============================================================================
// LEVER FETCHER
// =============================================================================
async function fetchLeverJobs(company: CompanyConfig): Promise<{ jobs: RawJob[]; stats: CompanyStats }> {
  const url = `https://api.lever.co/v0/postings/${company.slug}?mode=json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    if (res.status === 404) return { jobs: [], stats: emptyStats(company.slug) };
    throw new Error(`HTTP ${res.status}`);
  }
  const data = await res.json();
  const rawJobs: any[] = Array.isArray(data) ? data : [];
  const ats_board_url = `https://jobs.lever.co/${company.slug}`;
  const jobs: RawJob[] = [];
  for (const posting of rawJobs) {
    const location = posting.categories?.location || 'Unknown';
    const desc = stripHtml(posting.descriptionPlain || posting.description || '');
    const parsed = parseJobMetadata(desc, posting.text, location);
    jobs.push({
      company_name: company.name, company_slug: company.slug, title: posting.text,
      description_raw: desc.slice(0, 10000), location,
      remote_type: detectRemoteType(location, posting.text, desc),
      source_url: posting.hostedUrl || posting.applyUrl || `${ats_board_url}/${posting.id}`,
      source_type: 'lever', ats_board_url,
      career_page_url: company.career_page_url,
      country: detectCountry(location),
      salary_min: parsed.salary_min, salary_max: parsed.salary_max,
      salary_currency: parsed.salary_currency,
      experience_years_min: parsed.experience_min, experience_years_max: parsed.experience_max,
    });
  }
  return { jobs, stats: computeCompanyStats(company.slug, jobs) };
}

// =============================================================================
// COMPANY STATS + SYNC
// =============================================================================
function emptyStats(slug: string): CompanyStats {
  return { slug, totalRoles: 0, engRoles: 0, sponsorshipSignal: 'unknown', sponsorshipNotes: '' };
}

function computeCompanyStats(slug: string, jobs: RawJob[]): CompanyStats {
  const totalRoles = jobs.length;
  const engKw = ['engineer','developer','devops','sre','platform','backend','frontend','fullstack','full-stack','ml','data','ios','android','mobile','security','infrastructure','cloud','architect','software'];
  const engRoles = jobs.filter(j => engKw.some(kw => j.title.toLowerCase().includes(kw))).length;
  const sponsorYes = jobs.filter(j => detectSponsorship(j.description_raw) === 'yes').length;
  const sponsorNo  = jobs.filter(j => detectSponsorship(j.description_raw) === 'no').length;
  let sponsorshipSignal: 'yes' | 'no' | 'unknown' = 'unknown';
  let sponsorshipNotes = 'No explicit mention. Check individual listings.';
  if (totalRoles > 0) {
    if (sponsorYes / totalRoles >= 0.2 || sponsorYes > 0) {
      sponsorshipSignal = 'yes';
      sponsorshipNotes = `${sponsorYes} of ${totalRoles} postings mention visa sponsorship.`;
    } else if (sponsorNo / totalRoles >= 0.3) {
      sponsorshipSignal = 'no';
      sponsorshipNotes = `${sponsorNo} of ${totalRoles} postings indicate no sponsorship.`;
    }
  }
  return { slug, totalRoles, engRoles, sponsorshipSignal, sponsorshipNotes };
}

async function syncCompanyDetails(supabase: any, company: CompanyConfig, stats: CompanyStats) {
  const boardToken = GH_SLUG_MAP[company.slug] || company.slug;
  const ats_board_url = company.ats === 'greenhouse'
    ? `https://boards.greenhouse.io/${boardToken}`
    : `https://jobs.lever.co/${company.slug}`;
  await supabase.from('company_details').upsert({
    company_slug: company.slug, company_name: company.name,
    company_domain: guessDomain(company.slug),
    ats_type: company.ats, career_page_url: company.career_page_url,
    ats_board_url, open_roles_count: stats.totalRoles,
    open_roles_eng: stats.engRoles,
    sponsorship_signal: stats.sponsorshipSignal,
    sponsorship_notes: stats.sponsorshipNotes,
    last_fetched_at: new Date().toISOString(), fetch_error: null,
  }, { onConflict: 'company_slug', ignoreDuplicates: false });
}

// =============================================================================
// UPSERT JOBS
// =============================================================================
async function upsertJobs(supabase: any, jobs: RawJob[]): Promise<{ new: number; updated: number }> {
  if (!jobs.length) return { new: 0, updated: 0 };
  let newCount = 0, updatedCount = 0;
  const now = new Date().toISOString();
  for (let i = 0; i < jobs.length; i += 50) {
    const batch = jobs.slice(i, i + 50);
    const rows = batch.map(job => ({
      company_name: job.company_name, title: job.title,
      description_raw: job.description_raw,
      description_parsed: parseJD(job.description_raw, job.title),
      location: job.location, remote_type: job.remote_type,
      source_url: job.source_url, source_type: job.source_type,
      ats_board_url: job.ats_board_url,
      dedup_hash: generateDedupHash(job.company_name, job.title, job.location),
      first_seen_at: now, last_seen_at: now, is_active: true,
      realness_score: computeRealnessScore(job),
      sponsorship_status: detectSponsorship(job.description_raw),
      experience_years_min: job.experience_years_min,
      experience_years_max: job.experience_years_max,
      salary_min: job.salary_min, salary_max: job.salary_max,
      salary_currency: job.salary_currency || 'USD', country: job.country,
    }));
    const { data, error } = await supabase
      .from('job_postings')
      .upsert(rows, { onConflict: 'dedup_hash', ignoreDuplicates: false })
      .select('id, created_at, last_seen_at');
    if (error) { console.error('[job-fetcher] upsert error:', error.message); continue; }
    for (const row of (data || [])) {
      const diff = Math.abs(new Date(row.created_at).getTime() - new Date(row.last_seen_at).getTime());
      if (diff < 3000) newCount++; else updatedCount++;
    }
  }
  return { new: newCount, updated: updatedCount };
}

// =============================================================================
// HELPERS
// =============================================================================

function stripHtml(html: string): string {
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?(p|div|li|h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

function formatCompanyName(slug: string): string {
  const overrides: Record<string, string> = {
    'dbt-labs':'dbt Labs','openai':'OpenAI','huggingface':'Hugging Face','hashicorp':'HashiCorp',
    'cockroachlabs':'CockroachDB','posthog':'PostHog','n8n':'n8n','auth0':'Auth0',
    'hubspot':'HubSpot','gitlab':'GitLab','github':'GitHub','mongodb':'MongoDB',
    'snowflake':'Snowflake','clickup':'ClickUp','bamboohr':'BambooHR','hibob':'HiBob',
    'zoominfo':'ZoomInfo','builderio':'Builder.io','customerio':'Customer.io',
    'cultureamp':'Culture Amp','wandb':'Weights & Biases','sproutsocial':'Sprout Social',
    'montecarlodata':'Monte Carlo','abnormalsecurity':'Abnormal Security',
    'endorlabs':'Endor Labs','sixsense':'6sense',
  };
  return overrides[slug] || slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function guessDomain(slug: string): string {
  const overrides: Record<string, string> = {
    'dbt-labs':'getdbt.com','wandb':'wandb.ai','huggingface':'huggingface.co',
    'cockroachlabs':'cockroachlabs.com','customerio':'customer.io','builderio':'builder.io',
    'cultureamp':'cultureamp.com','montecarlodata':'montecarlodata.com',
  };
  return overrides[slug] || `${slug.replace(/-/g, '')}.com`;
}

function detectRemoteType(location: string, title: string, description: string): 'remote' | 'hybrid' | 'onsite' {
  const text = `${location} ${title} ${description}`.toLowerCase();
  if (text.includes('hybrid')) return 'hybrid';
  if (text.includes('remote') && !text.includes('non-remote') && !text.includes('not remote')) return 'remote';
  return 'onsite';
}

function detectCountry(location: string): string {
  const loc = location.toLowerCase().trim();
  
  // If location is empty or unknown, default to US
  if (!loc || loc === 'unknown' || loc === 'n/a') return 'US';

  // Greenhouse/Lever often include country directly: "San Francisco, CA, United States"
  // Check for explicit country names first (most reliable)
  const countryMap: [RegExp, string][] = [
    [/\bunited states\b|\busa\b|\bu\.s\.a\b|\bu\.s\b/i, 'US'],
    [/\bindia\b/i, 'IN'],
    [/\bunited kingdom\b|\b uk\b|\bengland\b|\bscotland\b|\bwales\b/i, 'GB'],
    [/\bcanada\b/i, 'CA'],
    [/\bgermany\b|\bdeutschland\b/i, 'DE'],
    [/\bfrance\b/i, 'FR'],
    [/\baustralia\b/i, 'AU'],
    [/\bsingapore\b/i, 'SG'],
    [/\bnetherlands\b|\bholland\b/i, 'NL'],
    [/\bireland\b/i, 'IE'],
    [/\bjapan\b/i, 'JP'],
    [/\bisrael\b/i, 'IL'],
    [/\bbrazil\b|\bbrasil\b/i, 'BR'],
    [/\bspain\b|\bespaña\b/i, 'ES'],
    [/\bitaly\b|\bitalia\b/i, 'IT'],
    [/\bsouth korea\b|\bkorea\b/i, 'KR'],
    [/\bsweden\b/i, 'SE'],
    [/\bswitzerland\b|\bschweiz\b/i, 'CH'],
    [/\bpoland\b|\bpolska\b/i, 'PL'],
    [/\bportugal\b/i, 'PT'],
    [/\bdenmark\b/i, 'DK'],
    [/\bnorway\b/i, 'NO'],
    [/\bfinland\b/i, 'FI'],
    [/\baustria\b|\bösterreich\b/i, 'AT'],
    [/\bbelgium\b/i, 'BE'],
    [/\bmexico\b|\bméxico\b/i, 'MX'],
    [/\bargentina\b/i, 'AR'],
    [/\bchile\b/i, 'CL'],
    [/\bcolombia\b/i, 'CO'],
    [/\bnew zealand\b/i, 'NZ'],
    [/\bphilippines\b/i, 'PH'],
    [/\bmalaysia\b/i, 'MY'],
    [/\bthailand\b/i, 'TH'],
    [/\bvietnam\b/i, 'VN'],
    [/\bindonesia\b/i, 'ID'],
    [/\btaiwan\b/i, 'TW'],
    [/\bchina\b/i, 'CN'],
    [/\bemirates\b|\buae\b|\bdubai\b|\babu dhabi\b/i, 'AE'],
  ];

  for (const [pattern, code] of countryMap) {
    if (pattern.test(loc)) return code;
  }

  // Check for US state abbreviations: "San Francisco, CA" or "New York, NY"
  const usState = loc.match(/,\s*([A-Z]{2})\s*$/);
  if (usState) {
    const US_STATES = new Set(['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC']);
    if (US_STATES.has(usState[1])) return 'US';
  }

  // Check for major Indian cities (Greenhouse often lists just city names)
  const indianCities = ['bangalore','bengaluru','mumbai','hyderabad','delhi','new delhi','pune','chennai','gurgaon','gurugram','noida','kolkata','ahmedabad','jaipur','kochi','lucknow','chandigarh','indore','thiruvananthapuram','coimbatore'];
  if (indianCities.some(c => loc.includes(c))) return 'IN';

  // Check for major UK cities
  const ukCities = ['london','manchester','birmingham','edinburgh','glasgow','bristol','leeds','cambridge','oxford','belfast','cardiff','liverpool','nottingham','reading','brighton'];
  if (ukCities.some(c => loc.includes(c))) return 'GB';

  // Check for major Canadian cities
  const caCities = ['toronto','vancouver','montreal','montréal','ottawa','calgary','edmonton','winnipeg','waterloo','kitchener','halifax','victoria'];
  if (caCities.some(c => loc.includes(c))) return 'CA';

  // Check for major German cities
  const deCities = ['berlin','munich','münchen','hamburg','frankfurt','cologne','köln','düsseldorf','stuttgart','dresden','leipzig'];
  if (deCities.some(c => loc.includes(c))) return 'DE';

  // Check for major French cities
  const frCities = ['paris','lyon','marseille','toulouse','lille','bordeaux','nantes','strasbourg'];
  if (frCities.some(c => loc.includes(c))) return 'FR';

  // Check for major Australian cities
  const auCities = ['sydney','melbourne','brisbane','perth','adelaide','canberra'];
  if (auCities.some(c => loc.includes(c))) return 'AU';

  // Check for Dutch cities
  const nlCities = ['amsterdam','rotterdam','den haag','the hague','eindhoven','utrecht'];
  if (nlCities.some(c => loc.includes(c))) return 'NL';

  // Check for Irish cities
  const ieCities = ['dublin','cork','galway','limerick'];
  if (ieCities.some(c => loc.includes(c))) return 'IE';

  // "Remote" without country context → US (most seed companies are US-based)
  if (loc.includes('remote')) return 'US';

  // Default: US (Greenhouse/Lever are primarily US platforms)
  return 'US';
}


function parseJobMetadata(text: string, title: string, location: string) {
  let salary_min: number | null = null, salary_max: number | null = null;
  let salary_currency = 'USD';
  let experience_min: number | null = null, experience_max: number | null = null;

  // USD: $120,000 - $180,000 or $120K-$180K
  const usd = text.match(/\$\s*([\d,]+)(?:k|K)?\s*[-\u2013to]+\s*\$?\s*([\d,]+)(?:k|K)?/);
  if (usd) {
    let mn = parseInt(usd[1].replace(/,/g, '')), mx = parseInt(usd[2].replace(/,/g, ''));
    if (mn < 1000) mn *= 1000; if (mx < 1000) mx *= 1000;
    salary_min = mn; salary_max = mx; salary_currency = 'USD';
  }

  // INR: ₹12-18 LPA or Rs.12-18 Lakhs
  const inr = text.match(/(?:\u20b9|Rs\.?)\s*([\d.]+)\s*[-\u2013to]*\s*([\d.]+)?\s*(?:LPA|lpa|Lakhs)/);
  if (inr) {
    salary_min = Math.round(parseFloat(inr[1]) * 100000);
    salary_max = inr[2] ? Math.round(parseFloat(inr[2]) * 100000) : salary_min;
    salary_currency = 'INR';
  }

  // GBP: £50,000 - £80,000
  const gbp = text.match(/£\s*([\d,]+)(?:k|K)?\s*[-\u2013to]+\s*£?\s*([\d,]+)(?:k|K)?/);
  if (gbp && !usd) {
    let mn = parseInt(gbp[1].replace(/,/g, '')), mx = parseInt(gbp[2].replace(/,/g, ''));
    if (mn < 1000) mn *= 1000; if (mx < 1000) mx *= 1000;
    salary_min = mn; salary_max = mx; salary_currency = 'GBP';
  }

  // EUR: €60,000 - €90,000
  const eur = text.match(/€\s*([\d,]+)(?:k|K)?\s*[-\u2013to]+\s*€?\s*([\d,]+)(?:k|K)?/);
  if (eur && !usd && !gbp) {
    let mn = parseInt(eur[1].replace(/,/g, '')), mx = parseInt(eur[2].replace(/,/g, ''));
    if (mn < 1000) mn *= 1000; if (mx < 1000) mx *= 1000;
    salary_min = mn; salary_max = mx; salary_currency = 'EUR';
  }

  // CAD: CA$80,000 - CA$120,000
  const cad = text.match(/(?:CA|C)\$\s*([\d,]+)(?:k|K)?\s*[-\u2013to]+\s*(?:CA|C)?\$?\s*([\d,]+)(?:k|K)?/);
  if (cad && !usd) {
    let mn = parseInt(cad[1].replace(/,/g, '')), mx = parseInt(cad[2].replace(/,/g, ''));
    if (mn < 1000) mn *= 1000; if (mx < 1000) mx *= 1000;
    salary_min = mn; salary_max = mx; salary_currency = 'CAD';
  }

  // AUD: A$90,000 - A$130,000
  const aud = text.match(/A\$\s*([\d,]+)(?:k|K)?\s*[-\u2013to]+\s*A?\$?\s*([\d,]+)(?:k|K)?/);
  if (aud && !usd && !cad) {
    let mn = parseInt(aud[1].replace(/,/g, '')), mx = parseInt(aud[2].replace(/,/g, ''));
    if (mn < 1000) mn *= 1000; if (mx < 1000) mx *= 1000;
    salary_min = mn; salary_max = mx; salary_currency = 'AUD';
  }

  // If no salary found from regex but country suggests non-USD, tag currency from location
  if (!salary_min && !salary_max) {
    const country = detectCountry(location);
    const currencyByCountry: Record<string, string> = {
      'GB': 'GBP', 'IN': 'INR', 'DE': 'EUR', 'FR': 'EUR', 'NL': 'EUR',
      'IE': 'EUR', 'ES': 'EUR', 'IT': 'EUR', 'AT': 'EUR', 'BE': 'EUR',
      'CA': 'CAD', 'AU': 'AUD', 'SG': 'SGD', 'JP': 'JPY', 'CH': 'CHF',
    };
    salary_currency = currencyByCountry[country] || 'USD';
  }

  // Experience years
  const em = text.match(/(\d+)\+?\s*(?:[-\u2013to]+\s*(\d+))?\s*years?\s*(?:of\s*)?(?:experience|exp)/i);
  if (em) {
    experience_min = parseInt(em[1]);
    experience_max = em[2] ? parseInt(em[2]) : null;
  }

  return { salary_min, salary_max, salary_currency, experience_min, experience_max };
}

function detectSponsorship(description: string): 'yes' | 'no' | 'unknown' {
  const text = description.toLowerCase();
  const no = ['no visa','not sponsor','unable to sponsor','cannot sponsor','must be authorized','must be eligible','without sponsorship'];
  const yes = ['visa sponsorship available','we will sponsor','sponsorship available','sponsor work authorization','sponsor visa','h-1b sponsorship'];
  if (no.some(s => text.includes(s))) return 'no';
  if (yes.some(s => text.includes(s))) return 'yes';
  if (text.includes('sponsorship') && text.includes('visa')) return 'yes';
  return 'unknown';
}

function computeRealnessScore(job: RawJob): number {
  let s = 50;
  if (job.source_type === 'greenhouse') s += 25;
  else if (job.source_type === 'lever') s += 23;
  if (job.description_raw.length > 500) s += 10;
  if (job.description_raw.length > 1500) s += 5;
  if (job.salary_min && job.salary_max) s += 5;
  if (job.experience_years_min !== null) s += 5;
  return Math.min(100, s);
}

function parseJD(text: string, title: string): object {
  const kw = [
    'javascript','typescript','python','java','c++','c#','go','rust','ruby','swift','kotlin',
    'php','scala','elixir','r','dart','react','angular','vue','svelte','next.js','nuxt','remix',
    'node.js','express','nestjs','django','flask','fastapi','spring','rails',
    'sql','postgresql','mysql','mongodb','redis','elasticsearch','dynamodb','cassandra',
    'aws','gcp','azure','docker','kubernetes','terraform','ansible','pulumi',
    'git','ci/cd','graphql','rest','grpc','kafka','rabbitmq',
    'machine learning','deep learning','pytorch','tensorflow','pandas','numpy','scikit-learn',
    'llm','nlp','computer vision','transformers',
    'figma','sketch','adobe','css','tailwind','sass',
    'agile','scrum','product management','data analysis','a/b testing','tableau','power bi',
    'salesforce','hubspot','segment','amplitude','mixpanel',
  ];
  const tl = text.toLowerCase();
  const found = kw.filter(s => tl.includes(s));
  const em = text.match(/(\d+)\+?\s*(?:[-\u2013to]+\s*(\d+))?\s*years/i);
  return {
    required_skills: found.slice(0, 15), preferred_skills: [], responsibilities: [],
    education_requirements: tl.includes('bachelor') || tl.includes('degree') ? ['bachelor'] : [],
    experience_years: { min: em ? parseInt(em[1]) : 0, max: em?.[2] ? parseInt(em[2]) : null },
    keywords: [...found, ...title.toLowerCase().split(/\s+/).filter(w => w.length > 3)].slice(0, 25),
  };
}