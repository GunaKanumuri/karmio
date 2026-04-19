-- ============================================================================
-- KARMIO — COMPLETE DATABASE SCHEMA
-- Run this entire file in Supabase SQL Editor for a fresh setup.
-- Paste into: Supabase Dashboard → SQL Editor → New query → Run
--
-- Includes all migrations 001–007 consolidated into one idempotent script.
-- Safe to re-run — uses IF NOT EXISTS / DO $$ guards throughout.
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Shared trigger function ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. USERS
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  visa_status TEXT CHECK (visa_status IN ('opt','stem_opt','h1b','green_card','citizen','other')),
  country TEXT NOT NULL DEFAULT 'US',
  current_location TEXT,
  target_locations TEXT[] DEFAULT '{}',
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free','popular','pro')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS tr_users_updated ON public.users;
CREATE TRIGGER tr_users_updated
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='users' AND policyname='Users can read own data') THEN
    CREATE POLICY "Users can read own data" ON public.users FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='users' AND policyname='Users can update own data') THEN
    CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='users' AND policyname='Users can insert own data') THEN
    CREATE POLICY "Users can insert own data" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- 2. TARGET PROFILES
CREATE TABLE IF NOT EXISTS public.target_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  profile_name TEXT NOT NULL,
  target_titles TEXT[] DEFAULT '{}',
  priority_skills TEXT[] DEFAULT '{}',
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  career_stage TEXT CHECK (career_stage IN ('student','early','mid','senior','executive')),
  career_field TEXT,
  job_types TEXT[] DEFAULT '{}',
  company_types TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_target_profiles_user ON public.target_profiles(user_id);

ALTER TABLE public.target_profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='target_profiles' AND policyname='Users manage own profiles') THEN
    CREATE POLICY "Users manage own profiles" ON public.target_profiles FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3. EXPERIENCES
CREATE TABLE IF NOT EXISTS public.experiences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  bullets JSONB DEFAULT '[]',
  technologies TEXT[] DEFAULT '{}',
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experiences_user ON public.experiences(user_id);
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='experiences' AND policyname='Users manage own experiences') THEN
    CREATE POLICY "Users manage own experiences" ON public.experiences FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- 4. PROJECTS
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  technologies TEXT[] DEFAULT '{}',
  contributions TEXT,
  results TEXT,
  github_link TEXT,
  project_type TEXT NOT NULL DEFAULT 'personal'
    CHECK (project_type IN ('university','personal','team','professional')),
  project_category TEXT DEFAULT 'side'
    CHECK (project_category IN ('side','academic','professional','hackathon','opensource')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON public.projects(user_id);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='projects' AND policyname='Users manage own projects') THEN
    CREATE POLICY "Users manage own projects" ON public.projects FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- 5. EDUCATION
CREATE TABLE IF NOT EXISTS public.education (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  institution TEXT NOT NULL,
  degree TEXT NOT NULL,
  field TEXT,
  graduation_date DATE,
  gpa NUMERIC(3,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_education_user ON public.education(user_id);
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='education' AND policyname='Users manage own education') THEN
    CREATE POLICY "Users manage own education" ON public.education FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- 6. SKILLS
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  skill_category TEXT CHECK (skill_category IN ('technical','tool','framework','language','soft')),
  proficiency INTEGER CHECK (proficiency BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skills_user ON public.skills(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_skills_user_name_unique ON public.skills(user_id, skill_name);
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='skills' AND policyname='Users manage own skills') THEN
    CREATE POLICY "Users manage own skills" ON public.skills FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- 7. JOB POSTINGS
CREATE TABLE IF NOT EXISTS public.job_postings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  company_logo_url TEXT,
  title TEXT NOT NULL,
  description_raw TEXT,
  description_parsed JSONB,
  location TEXT,
  remote_type TEXT CHECK (remote_type IN ('onsite','hybrid','remote')),
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'USD',
  source_url TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('greenhouse','lever','ashby','workday','usajobs','naukri','freshteam','instahyre','other')),
  ats_board_url TEXT,
  dedup_hash TEXT UNIQUE NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  realness_score INTEGER DEFAULT 50 CHECK (realness_score BETWEEN 0 AND 100),
  sponsorship_status TEXT DEFAULT 'unknown' CHECK (sponsorship_status IN ('yes','no','unknown')),
  experience_years_min INTEGER,
  experience_years_max INTEGER,
  country TEXT DEFAULT 'US',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_active ON public.job_postings(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_jobs_country_active ON public.job_postings(country, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_jobs_first_seen ON public.job_postings(first_seen_at DESC) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_jobs_realness ON public.job_postings(realness_score DESC) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_jobs_dedup ON public.job_postings(dedup_hash);
CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm ON public.job_postings USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON public.job_postings(company_name) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_jobs_sponsor ON public.job_postings(sponsorship_status) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_jobs_source ON public.job_postings(source_type);

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='job_postings' AND policyname='Anyone can read active jobs') THEN
    CREATE POLICY "Anyone can read active jobs" ON public.job_postings FOR SELECT USING (TRUE);
  END IF;
END $$;

-- 8. JOB SOURCES
CREATE TABLE IF NOT EXISTS public.job_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_url TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_sources_job ON public.job_sources(job_id);
ALTER TABLE public.job_sources ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='job_sources' AND policyname='Anyone can read job sources') THEN
    CREATE POLICY "Anyone can read job sources" ON public.job_sources FOR SELECT USING (TRUE);
  END IF;
END $$;

-- 9. COMPANY DETAILS
CREATE TABLE IF NOT EXISTS public.company_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  ats_type TEXT CHECK (ats_type IN ('greenhouse','lever','ashby','workday','other')),
  greenhouse_slug TEXT,
  lever_slug TEXT,
  career_page_url TEXT,
  domain TEXT,
  industry TEXT,
  headcount_range TEXT,
  headquarters TEXT,
  description TEXT,
  is_seed BOOLEAN DEFAULT FALSE,
  last_fetched_at TIMESTAMPTZ,
  active_job_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_slug ON public.company_details(slug);
CREATE INDEX IF NOT EXISTS idx_company_ats ON public.company_details(ats_type);
CREATE INDEX IF NOT EXISTS idx_company_seed ON public.company_details(is_seed) WHERE is_seed = TRUE;

DROP TRIGGER IF EXISTS tr_company_details_updated ON public.company_details;
CREATE TRIGGER tr_company_details_updated
  BEFORE UPDATE ON public.company_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.company_details ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='company_details' AND policyname='Anyone can read company details') THEN
    CREATE POLICY "Anyone can read company details" ON public.company_details FOR SELECT USING (TRUE);
  END IF;
END $$;

-- 10. JOB FETCH LOG
CREATE TABLE IF NOT EXISTS public.job_fetch_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_slug TEXT NOT NULL,
  ats_type TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  jobs_found INTEGER DEFAULT 0,
  jobs_new INTEGER DEFAULT 0,
  jobs_updated INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_fetch_log_company ON public.job_fetch_log(company_slug, fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_fetch_log_time ON public.job_fetch_log(fetched_at DESC);
ALTER TABLE public.job_fetch_log ENABLE ROW LEVEL SECURITY;

-- 11. USER JOB MATCHES
CREATE TABLE IF NOT EXISTS public.user_job_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  target_profile_id UUID REFERENCES public.target_profiles(id) ON DELETE SET NULL,
  match_score INTEGER DEFAULT 0 CHECK (match_score BETWEEN 0 AND 100),
  skills_score INTEGER DEFAULT 0,
  experience_score INTEGER DEFAULT 0,
  education_score INTEGER DEFAULT 0,
  project_score INTEGER DEFAULT 0,
  title_score INTEGER DEFAULT 0,
  matched_skills TEXT[] DEFAULT '{}',
  missing_skills TEXT[] DEFAULT '{}',
  best_projects UUID[] DEFAULT '{}',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_user_job ON public.user_job_matches(user_id, job_id);
CREATE INDEX IF NOT EXISTS idx_matches_user_score ON public.user_job_matches(user_id, match_score DESC);
CREATE INDEX IF NOT EXISTS idx_matches_job ON public.user_job_matches(job_id);
ALTER TABLE public.user_job_matches ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_job_matches' AND policyname='Users read own matches') THEN
    CREATE POLICY "Users read own matches" ON public.user_job_matches FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- 12. APPLICATIONS
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.job_postings(id),
  target_profile_id UUID REFERENCES public.target_profiles(id),
  status TEXT NOT NULL DEFAULT 'saved' CHECK (
    status IN (
      'saved','resume_ready','applied',
      'hr_screen','technical','behavioral','final',
      'offer','rejected','no_response','dismissed'
    )
  ),
  applied_at TIMESTAMPTZ,
  resume_recipe_id UUID,
  match_score INTEGER DEFAULT 0 CHECK (match_score BETWEEN 0 AND 100),
  notes TEXT,
  rejection_reason TEXT,
  outreach_status TEXT DEFAULT 'none'
    CHECK (outreach_status IN ('none','pending','sent','followed_up','responded')),
  stage_entered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apps_user ON public.applications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_apps_status ON public.applications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_apps_job ON public.applications(job_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_apps_user_job ON public.applications(user_id, job_id);

DROP TRIGGER IF EXISTS tr_applications_updated ON public.applications;
CREATE TRIGGER tr_applications_updated
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='applications' AND policyname='Users manage own applications') THEN
    CREATE POLICY "Users manage own applications" ON public.applications FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- 13. RESUME RECIPES
CREATE TABLE IF NOT EXISTS public.resume_recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.job_postings(id),
  target_profile_id UUID REFERENCES public.target_profiles(id),
  selected_project_ids UUID[] DEFAULT '{}',
  enhanced_bullets JSONB DEFAULT '{}',
  enhanced_summary TEXT,
  keywords_matched TEXT[] DEFAULT '{}',
  keywords_missing TEXT[] DEFAULT '{}',
  match_score INTEGER DEFAULT 0,
  format TEXT DEFAULT 'docx' CHECK (format IN ('docx','pdf','latex')),
  page_count INTEGER DEFAULT 1,
  cover_letter_text TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipes_user ON public.resume_recipes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_job ON public.resume_recipes(job_id);
ALTER TABLE public.resume_recipes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='resume_recipes' AND policyname='Users manage own recipes') THEN
    CREATE POLICY "Users manage own recipes" ON public.resume_recipes FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Add FK from applications to resume_recipes (safe)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_apps_recipe'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT fk_apps_recipe
      FOREIGN KEY (resume_recipe_id) REFERENCES public.resume_recipes(id);
  END IF;
END $$;

-- 14. CONTACTS
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  company_name TEXT,
  last_job_title TEXT,
  linkedin_url TEXT,
  email TEXT,
  connection_status TEXT DEFAULT 'pending'
    CHECK (connection_status IN ('pending','connected','responded','no_response')),
  source TEXT DEFAULT 'manual'
    CHECK (source IN ('manual','auto_suggested','imported')),
  role_type TEXT CHECK (role_type IN ('hr','recruiter','hiring_manager','engineer','other')),
  last_contacted_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_user ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_app ON public.contacts(application_id);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contacts' AND policyname='Users manage own contacts') THEN
    CREATE POLICY "Users manage own contacts" ON public.contacts FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- 15. MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tone TEXT NOT NULL CHECK (tone IN ('professional','casual','referral','technical')),
  content TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  got_response BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_contact ON public.messages(contact_id);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='Users manage own messages') THEN
    CREATE POLICY "Users manage own messages" ON public.messages FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- 16. FOLLOW-UPS
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('networking','recruiter','general')),
  day_number INTEGER NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_followups_due ON public.follow_ups(user_id, due_date) WHERE is_completed = FALSE;
CREATE INDEX IF NOT EXISTS idx_followups_app ON public.follow_ups(application_id);
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='follow_ups' AND policyname='Users manage own follow-ups') THEN
    CREATE POLICY "Users manage own follow-ups" ON public.follow_ups FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- 17. OUTREACH SUGGESTIONS
CREATE TABLE IF NOT EXISTS public.outreach_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  company_domain TEXT,
  company_linkedin_url TEXT,
  suggested_roles JSONB NOT NULL DEFAULT '[]',
  hr_draft TEXT,
  technical_draft TEXT,
  search_guidance TEXT,
  linkedin_search_url TEXT,
  outreach_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (outreach_status IN ('pending','message_drafted','sent','followed_up','responded','interview_scheduled')),
  sent_at TIMESTAMPTZ,
  response_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_user ON public.outreach_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_outreach_app ON public.outreach_suggestions(application_id);
CREATE INDEX IF NOT EXISTS idx_outreach_status ON public.outreach_suggestions(user_id, outreach_status);

DROP TRIGGER IF EXISTS tr_outreach_updated ON public.outreach_suggestions;
CREATE TRIGGER tr_outreach_updated
  BEFORE UPDATE ON public.outreach_suggestions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.outreach_suggestions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='outreach_suggestions' AND policyname='Users manage own outreach') THEN
    CREATE POLICY "Users manage own outreach" ON public.outreach_suggestions FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- 18. CALENDAR EVENTS
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('interview','assessment','deadline','todo','prep','follow_up','other')),
  title TEXT NOT NULL,
  notes TEXT,
  time_slot TEXT,
  company_name TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cal_events_user ON public.calendar_events(user_id, event_date);
CREATE INDEX IF NOT EXISTS idx_cal_events_date ON public.calendar_events(event_date) WHERE is_completed = FALSE;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='calendar_events' AND policyname='Users manage own calendar') THEN
    CREATE POLICY "Users manage own calendar" ON public.calendar_events FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- 19. USER SETTINGS
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reminder_times TEXT[] DEFAULT ARRAY['09:00','13:00','17:00'],
  reminder_days TEXT[] DEFAULT ARRAY['mon','tue','wed','thu','fri'],
  email_digest TEXT DEFAULT 'daily' CHECK (email_digest IN ('daily','weekly','off')),
  job_alert_frequency TEXT DEFAULT 'daily' CHECK (job_alert_frequency IN ('realtime','daily','weekly')),
  default_resume_format TEXT DEFAULT 'docx' CHECK (default_resume_format IN ('docx','pdf')),
  default_page_count INTEGER DEFAULT 1,
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_settings' AND policyname='Users manage own settings') THEN
    CREATE POLICY "Users manage own settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- 20. WEEKLY USAGE (tier enforcement)
CREATE TABLE IF NOT EXISTS public.weekly_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  applications_count INTEGER NOT NULL DEFAULT 0,
  resumes_generated INTEGER NOT NULL DEFAULT 0,
  messages_generated INTEGER NOT NULL DEFAULT 0,
  cover_letters_generated INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_user_week ON public.weekly_usage(user_id, week_start);
ALTER TABLE public.weekly_usage ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='weekly_usage' AND policyname='Users read own usage') THEN
    CREATE POLICY "Users read own usage" ON public.weekly_usage FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- 21. RATE LIMIT LOG
CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ratelimit_user_action ON public.rate_limit_log(user_id, action, created_at DESC);

-- 22. PREP PRACTICE
CREATE TABLE IF NOT EXISTS public.prep_practice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  answer_draft TEXT DEFAULT '',
  confidence TEXT DEFAULT 'not_started'
    CHECK (confidence IN ('not_started','practiced','confident')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, question_key)
);

CREATE INDEX IF NOT EXISTS idx_prep_practice_user ON public.prep_practice(user_id);
ALTER TABLE public.prep_practice ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='prep_practice' AND policyname='Users can view own prep') THEN
    CREATE POLICY "Users can view own prep" ON public.prep_practice FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert own prep" ON public.prep_practice FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update own prep" ON public.prep_practice FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Users can delete own prep" ON public.prep_practice FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 23. MOCK SESSIONS
CREATE TABLE IF NOT EXISTS public.mock_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  stage TEXT NOT NULL CHECK (stage IN ('hr','technical','behavioral','offer')),
  messages JSONB DEFAULT '[]'::jsonb,
  summary_feedback JSONB DEFAULT '{}'::jsonb,
  question_count INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mock_sessions_user ON public.mock_sessions(user_id, created_at DESC);
ALTER TABLE public.mock_sessions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mock_sessions' AND policyname='Users can view own sessions') THEN
    CREATE POLICY "Users can view own sessions" ON public.mock_sessions FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert own sessions" ON public.mock_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update own sessions" ON public.mock_sessions FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Auto-create user record + settings + weekly_usage on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.weekly_usage (user_id, week_start)
  VALUES (NEW.id, DATE_TRUNC('week', NOW())::DATE)
  ON CONFLICT (user_id, week_start) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Get or create current week usage row
CREATE OR REPLACE FUNCTION get_weekly_usage(p_user_id UUID)
RETURNS SETOF public.weekly_usage AS $$
DECLARE
  v_week_start DATE := DATE_TRUNC('week', NOW())::DATE;
BEGIN
  INSERT INTO public.weekly_usage (user_id, week_start)
  VALUES (p_user_id, v_week_start)
  ON CONFLICT (user_id, week_start) DO NOTHING;

  RETURN QUERY
  SELECT *
  FROM public.weekly_usage
  WHERE user_id = p_user_id
    AND week_start = v_week_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment a weekly usage counter (whitelist prevents SQL injection)
CREATE OR REPLACE FUNCTION increment_usage(p_user_id UUID, p_field TEXT)
RETURNS void AS $$
DECLARE
  v_week_start DATE := DATE_TRUNC('week', NOW())::DATE;
BEGIN
  IF p_field NOT IN ('applications_count','resumes_generated','messages_generated','cover_letters_generated') THEN
    RAISE EXCEPTION 'Invalid usage field: %', p_field;
  END IF;

  INSERT INTO public.weekly_usage (user_id, week_start)
  VALUES (p_user_id, v_week_start)
  ON CONFLICT (user_id, week_start) DO NOTHING;

  EXECUTE format(
    'UPDATE public.weekly_usage SET %I = %I + 1 WHERE user_id = $1 AND week_start = $2',
    p_field, p_field
  ) USING p_user_id, v_week_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DONE
-- All 23 tables, indexes, RLS policies, triggers, and helper functions created.
-- ============================================================================
