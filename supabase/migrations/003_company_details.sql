-- ============================================
-- KARMIO MIGRATION 003 — SAFE CLEAN
-- ============================================

-- Safe cleanup: only drop what actually exists
DO $$ BEGIN
  -- company_details cleanup
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='company_details') THEN
    DROP POLICY IF EXISTS "Anyone can read company details" ON public.company_details;
    DROP POLICY IF EXISTS "Service role can manage companies" ON public.company_details;
    DROP TRIGGER IF EXISTS tr_company_details_updated ON public.company_details;
    DROP TABLE public.company_details CASCADE;
  END IF;

  -- job_fetch_log cleanup
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='job_fetch_log') THEN
    DROP POLICY IF EXISTS "Service role manages fetch logs" ON public.job_fetch_log;
    DROP TABLE public.job_fetch_log CASCADE;
  END IF;

  -- user_job_matches cleanup
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='user_job_matches') THEN
    DROP POLICY IF EXISTS "Users read own matches" ON public.user_job_matches;
    DROP POLICY IF EXISTS "Service role manages matches" ON public.user_job_matches;
    DROP TABLE public.user_job_matches CASCADE;
  END IF;

  -- job_sources cleanup
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='job_sources') THEN
    DROP TABLE public.job_sources CASCADE;
  END IF;
END $$;


CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. COMPANY DETAILS
CREATE TABLE public.company_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_slug TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  company_domain TEXT,
  company_logo_url TEXT,
  ats_type TEXT NOT NULL DEFAULT 'greenhouse' CHECK (ats_type IN ('greenhouse','lever','ashby','workday','other')),
  career_page_url TEXT,
  ats_board_url TEXT,
  open_roles_count INTEGER NOT NULL DEFAULT 0,
  open_roles_eng INTEGER NOT NULL DEFAULT 0,
  sponsorship_signal TEXT DEFAULT 'unknown' CHECK (sponsorship_signal IN ('yes','no','unknown')),
  sponsorship_notes TEXT,
  industry TEXT,
  employee_count_range TEXT,
  funding_stage TEXT,
  headquarters TEXT,
  tech_stack TEXT[] DEFAULT '{}',
  glassdoor_rating NUMERIC(2,1),
  last_fetched_at TIMESTAMPTZ,
  fetch_error TEXT,
  fetch_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_company_slug ON public.company_details(company_slug);
CREATE INDEX idx_company_last_fetched ON public.company_details(last_fetched_at);
CREATE INDEX idx_company_open_roles ON public.company_details(open_roles_count DESC) WHERE open_roles_count > 0;

CREATE TRIGGER tr_company_details_updated
  BEFORE UPDATE ON public.company_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.company_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read company details" ON public.company_details FOR SELECT USING (true);
CREATE POLICY "Service role can manage companies" ON public.company_details FOR ALL USING (auth.role() = 'service_role');


-- 2. JOB FETCH LOG
CREATE TABLE public.job_fetch_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  triggered_by TEXT NOT NULL DEFAULT 'manual',
  companies_attempted INTEGER NOT NULL DEFAULT 0,
  companies_succeeded INTEGER NOT NULL DEFAULT 0,
  jobs_fetched INTEGER NOT NULL DEFAULT 0,
  jobs_new INTEGER NOT NULL DEFAULT 0,
  jobs_updated INTEGER NOT NULL DEFAULT 0,
  jobs_stale_deactivated INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  errors JSONB DEFAULT '[]',
  success BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fetch_log_created ON public.job_fetch_log(created_at DESC);

ALTER TABLE public.job_fetch_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages fetch logs" ON public.job_fetch_log FOR ALL USING (auth.role() = 'service_role');


-- 3. USER JOB MATCHES
CREATE TABLE public.user_job_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  match_score INTEGER NOT NULL DEFAULT 0 CHECK (match_score BETWEEN 0 AND 100),
  skills_score NUMERIC(4,2) DEFAULT 0,
  experience_score NUMERIC(4,2) DEFAULT 0,
  education_score NUMERIC(4,2) DEFAULT 0,
  project_score NUMERIC(4,2) DEFAULT 0,
  title_score NUMERIC(4,2) DEFAULT 0,
  matched_skills TEXT[] DEFAULT '{}',
  missing_skills TEXT[] DEFAULT '{}',
  best_projects TEXT[] DEFAULT '{}',
  target_profile_id UUID REFERENCES public.target_profiles(id) ON DELETE SET NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

CREATE INDEX idx_ujm_user_score ON public.user_job_matches(user_id, match_score DESC);
CREATE INDEX idx_ujm_job ON public.user_job_matches(job_id);
CREATE INDEX idx_ujm_user_job ON public.user_job_matches(user_id, job_id);

ALTER TABLE public.user_job_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own matches" ON public.user_job_matches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages matches" ON public.user_job_matches FOR ALL USING (auth.role() = 'service_role');


-- 4. JOB SOURCES
CREATE TABLE IF NOT EXISTS public.job_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_url TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_sources_job ON public.job_sources(job_id);


-- 5. Add missing columns to job_postings
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='job_postings' AND column_name='description_parsed') THEN
    ALTER TABLE public.job_postings ADD COLUMN description_parsed JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='job_postings' AND column_name='experience_years_min') THEN
    ALTER TABLE public.job_postings ADD COLUMN experience_years_min INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='job_postings' AND column_name='experience_years_max') THEN
    ALTER TABLE public.job_postings ADD COLUMN experience_years_max INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='job_postings' AND column_name='salary_currency') THEN
    ALTER TABLE public.job_postings ADD COLUMN salary_currency TEXT DEFAULT 'USD';
  END IF;
END $$;


-- 6. Performance indexes
CREATE INDEX IF NOT EXISTS idx_jobs_active ON public.job_postings(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_jobs_country ON public.job_postings(country) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_jobs_first_seen ON public.job_postings(first_seen_at DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_jobs_realness ON public.job_postings(realness_score DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_jobs_sponsor ON public.job_postings(sponsorship_status) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm ON public.job_postings USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_jobs_feed ON public.job_postings(is_active, country, first_seen_at DESC) WHERE is_active = true;