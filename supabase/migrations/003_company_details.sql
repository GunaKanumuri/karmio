-- ============================================
-- KARMIO MIGRATION 003
-- Company details cache + job fetch audit log
-- Run after 001_initial_schema.sql
-- ============================================

CREATE TABLE IF NOT EXISTS public.company_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_slug TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  company_domain TEXT,
  logo_url TEXT,
  ats_type TEXT CHECK (ats_type IN ('greenhouse', 'lever', 'ashby', 'workday', 'other')),
  career_page_url TEXT NOT NULL,
  ats_board_url TEXT,
  open_roles_count INTEGER DEFAULT 0,
  open_roles_eng INTEGER DEFAULT 0,
  sponsorship_signal TEXT DEFAULT 'unknown'
    CHECK (sponsorship_signal IN ('yes', 'no', 'unknown')),
  sponsorship_notes TEXT,
  company_size TEXT CHECK (company_size IN (
    '1-10', '11-50', '51-200', '201-500', '501-1000',
    '1001-5000', '5001-10000', '10000+'
  )),
  industry TEXT,
  hq_location TEXT,
  founded_year INTEGER,
  description TEXT,
  country TEXT DEFAULT 'US',
  last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fetch_error TEXT,
  fetch_success_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_company_slug ON public.company_details(company_slug);
CREATE INDEX idx_company_country ON public.company_details(country);
CREATE INDEX idx_company_ats ON public.company_details(ats_type);
CREATE INDEX idx_company_last_fetched ON public.company_details(last_fetched_at DESC);

CREATE TRIGGER tr_company_updated
  BEFORE UPDATE ON public.company_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.company_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read company details" ON public.company_details FOR SELECT USING (TRUE);

-- ============================================
-- JOB FETCH AUDIT LOG
-- ============================================
CREATE TABLE IF NOT EXISTS public.job_fetch_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  triggered_by TEXT DEFAULT 'cron',
  companies_attempted INTEGER DEFAULT 0,
  companies_succeeded INTEGER DEFAULT 0,
  jobs_fetched INTEGER DEFAULT 0,
  jobs_new INTEGER DEFAULT 0,
  jobs_updated INTEGER DEFAULT 0,
  jobs_stale_deactivated INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_count INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  success BOOLEAN DEFAULT TRUE,
  notes TEXT
);

CREATE INDEX idx_fetch_log_run_at ON public.job_fetch_log(run_at DESC);
ALTER TABLE public.job_fetch_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SEED: Known companies
-- ============================================
INSERT INTO public.company_details (
  company_slug, company_name, company_domain,
  ats_type, career_page_url, ats_board_url,
  company_size, industry, hq_location, country
) VALUES
  ('stripe',       'Stripe',       'stripe.com',       'greenhouse', 'https://stripe.com/jobs',                        'https://boards.greenhouse.io/stripe',        '1001-5000',  'Fintech',              'San Francisco, CA', 'US'),
  ('airbnb',       'Airbnb',       'airbnb.com',       'greenhouse', 'https://careers.airbnb.com',                     'https://boards.greenhouse.io/airbnb',        '1001-5000',  'Travel / Hospitality', 'San Francisco, CA', 'US'),
  ('figma',        'Figma',        'figma.com',        'greenhouse', 'https://www.figma.com/careers',                  'https://boards.greenhouse.io/figma',         '501-1000',   'Design Tools',         'San Francisco, CA', 'US'),
  ('notion',       'Notion',       'notion.so',        'greenhouse', 'https://www.notion.so/careers',                  'https://boards.greenhouse.io/notion',        '501-1000',   'Productivity',         'San Francisco, CA', 'US'),
  ('plaid',        'Plaid',        'plaid.com',        'greenhouse', 'https://plaid.com/careers',                      'https://boards.greenhouse.io/plaid',         '501-1000',   'Fintech',              'San Francisco, CA', 'US'),
  ('gusto',        'Gusto',        'gusto.com',        'greenhouse', 'https://gusto.com/about/careers',                'https://boards.greenhouse.io/gusto',         '1001-5000',  'HR / Payroll',         'San Francisco, CA', 'US'),
  ('coinbase',     'Coinbase',     'coinbase.com',     'greenhouse', 'https://www.coinbase.com/careers',               'https://boards.greenhouse.io/coinbase',      '1001-5000',  'Crypto / Web3',        'San Francisco, CA', 'US'),
  ('brex',         'Brex',         'brex.com',         'greenhouse', 'https://www.brex.com/careers',                   'https://boards.greenhouse.io/brex',          '1001-5000',  'Fintech',              'San Francisco, CA', 'US'),
  ('ramp',         'Ramp',         'ramp.com',         'greenhouse', 'https://ramp.com/careers',                       'https://boards.greenhouse.io/ramp',          '501-1000',   'Fintech',              'New York, NY',      'US'),
  ('flexport',     'Flexport',     'flexport.com',     'greenhouse', 'https://www.flexport.com/careers',               'https://boards.greenhouse.io/flexport',      '1001-5000',  'Logistics',            'San Francisco, CA', 'US'),
  ('airtable',     'Airtable',     'airtable.com',     'greenhouse', 'https://airtable.com/careers',                   'https://boards.greenhouse.io/airtable',      '501-1000',   'Productivity',         'San Francisco, CA', 'US'),
  ('databricks',   'Databricks',   'databricks.com',   'greenhouse', 'https://www.databricks.com/company/careers',     'https://boards.greenhouse.io/databricks',    '5001-10000', 'Data / AI',            'San Francisco, CA', 'US'),
  ('hashicorp',    'HashiCorp',    'hashicorp.com',    'greenhouse', 'https://www.hashicorp.com/jobs',                 'https://boards.greenhouse.io/hashicorp',     '1001-5000',  'DevOps / Cloud',       'San Francisco, CA', 'US'),
  ('duolingo',     'Duolingo',     'duolingo.com',     'greenhouse', 'https://careers.duolingo.com',                   'https://boards.greenhouse.io/duolingo',      '501-1000',   'EdTech',               'Pittsburgh, PA',    'US'),
  ('discord',      'Discord',      'discord.com',      'greenhouse', 'https://discord.com/careers',                    'https://boards.greenhouse.io/discord',       '501-1000',   'Communications',       'San Francisco, CA', 'US'),
  ('reddit',       'Reddit',       'reddit.com',       'greenhouse', 'https://www.redditinc.com/careers',              'https://boards.greenhouse.io/reddit',        '1001-5000',  'Social Media',         'San Francisco, CA', 'US'),
  ('snyk',         'Snyk',         'snyk.io',          'greenhouse', 'https://snyk.io/careers',                        'https://boards.greenhouse.io/snyk',          '501-1000',   'DevSecOps',            'Boston, MA',        'US'),
  ('vercel',       'Vercel',       'vercel.com',       'greenhouse', 'https://vercel.com/careers',                     'https://boards.greenhouse.io/vercel',        '201-500',    'Developer Tools',      'San Francisco, CA', 'US'),
  ('retool',       'Retool',       'retool.com',       'greenhouse', 'https://retool.com/careers',                     'https://boards.greenhouse.io/retool',        '201-500',    'Developer Tools',      'San Francisco, CA', 'US'),
  ('dbt-labs',     'dbt Labs',     'getdbt.com',       'greenhouse', 'https://www.getdbt.com/dbt-labs/open-roles',     'https://boards.greenhouse.io/dbtlabs',       '201-500',    'Data Engineering',     'San Francisco, CA', 'US'),
  ('anduril',      'Anduril',      'anduril.com',      'greenhouse', 'https://www.anduril.com/open-roles',             'https://boards.greenhouse.io/anduril',       '1001-5000',  'Defense Tech',         'Costa Mesa, CA',    'US'),
  ('palantir',     'Palantir',     'palantir.com',     'greenhouse', 'https://www.palantir.com/careers',               'https://boards.greenhouse.io/palantir',      '1001-5000',  'Data / Gov',           'Denver, CO',        'US'),
  ('datadog',      'Datadog',      'datadoghq.com',    'greenhouse', 'https://careers.datadoghq.com',                  'https://boards.greenhouse.io/datadog',       '5001-10000', 'Observability',        'New York, NY',      'US'),
  ('cloudflare',   'Cloudflare',   'cloudflare.com',   'greenhouse', 'https://www.cloudflare.com/careers',             'https://boards.greenhouse.io/cloudflare',    '1001-5000',  'Networking / CDN',     'San Francisco, CA', 'US'),
  ('twilio',       'Twilio',       'twilio.com',       'greenhouse', 'https://www.twilio.com/en-us/company/jobs',      'https://boards.greenhouse.io/twilio',        '5001-10000', 'Communications',       'San Francisco, CA', 'US'),
  ('netflix',      'Netflix',      'netflix.com',      'lever',      'https://jobs.netflix.com',                       'https://api.lever.co/v0/postings/netflix',   '10000+',     'Entertainment',        'Los Gatos, CA',     'US'),
  ('spotify',      'Spotify',      'spotify.com',      'lever',      'https://www.lifeatspotify.com/jobs',             'https://api.lever.co/v0/postings/spotify',   '5001-10000', 'Music / Media',        'New York, NY',      'US'),
  ('robinhood',    'Robinhood',    'robinhood.com',    'lever',      'https://careers.robinhood.com',                  'https://api.lever.co/v0/postings/robinhood', '1001-5000',  'Fintech',              'Menlo Park, CA',    'US'),
  ('yelp',         'Yelp',         'yelp.com',         'lever',      'https://www.yelp.careers',                       'https://api.lever.co/v0/postings/yelp',      '1001-5000',  'Local Commerce',       'San Francisco, CA', 'US'),
  ('lyft',         'Lyft',         'lyft.com',         'lever',      'https://www.lyft.com/careers',                   'https://api.lever.co/v0/postings/lyft',      '1001-5000',  'Rideshare',            'San Francisco, CA', 'US'),
  ('instacart',    'Instacart',    'instacart.com',    'lever',      'https://instacart.careers',                      'https://api.lever.co/v0/postings/instacart', '1001-5000',  'Grocery / Delivery',   'San Francisco, CA', 'US'),
  ('openai',       'OpenAI',       'openai.com',       'lever',      'https://openai.com/careers',                     'https://api.lever.co/v0/postings/openai',    '501-1000',   'AI / Research',        'San Francisco, CA', 'US'),
  ('anthropic',    'Anthropic',    'anthropic.com',    'lever',      'https://www.anthropic.com/careers',              'https://api.lever.co/v0/postings/anthropic', '201-500',    'AI / Research',        'San Francisco, CA', 'US'),
  ('mistral',      'Mistral AI',   'mistral.ai',       'lever',      'https://mistral.ai/company/#careers',            'https://api.lever.co/v0/postings/mistral',   '51-200',     'AI / Research',        'Paris, France',     'US'),
  ('scale-ai',     'Scale AI',     'scale.com',        'lever',      'https://scale.com/careers',                      'https://api.lever.co/v0/postings/scale-ai',  '501-1000',   'AI / Data',            'San Francisco, CA', 'US'),
  ('huggingface',  'Hugging Face', 'huggingface.co',   'lever',      'https://apply.workable.com/huggingface',         'https://api.lever.co/v0/postings/huggingface','201-500',   'AI / ML',              'New York, NY',      'US')
ON CONFLICT (company_slug) DO NOTHING;