-- ============================================
-- KARMIO DATABASE SCHEMA v1.0
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  visa_status TEXT CHECK (visa_status IN ('opt','stem_opt','h1b','green_card','citizen','other')),
  country TEXT NOT NULL DEFAULT 'US' CHECK (country IN ('US','IN')),
  current_location TEXT,
  target_locations TEXT[] DEFAULT '{}',
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free','popular','pro')),
  stripe_customer_id TEXT,
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_users_updated
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own data" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own data" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. TARGET PROFILES
-- ============================================
CREATE TABLE public.target_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  profile_name TEXT NOT NULL,
  target_titles TEXT[] DEFAULT '{}',
  priority_skills TEXT[] DEFAULT '{}',
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_target_profiles_user ON public.target_profiles(user_id);

ALTER TABLE public.target_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profiles" ON public.target_profiles FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 3. EXPERIENCES
-- ============================================
CREATE TABLE public.experiences (
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

CREATE INDEX idx_experiences_user ON public.experiences(user_id);

ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own experiences" ON public.experiences FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 4. PROJECTS
-- ============================================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  technologies TEXT[] DEFAULT '{}',
  contributions TEXT,
  results TEXT,
  github_link TEXT,
  project_type TEXT NOT NULL CHECK (project_type IN ('university','personal','team','professional')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_user ON public.projects(user_id);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own projects" ON public.projects FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 5. EDUCATION
-- ============================================
CREATE TABLE public.education (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  institution TEXT NOT NULL,
  degree TEXT NOT NULL,
  field TEXT,
  graduation_date DATE,
  gpa NUMERIC(3,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_education_user ON public.education(user_id);

ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own education" ON public.education FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 6. SKILLS
-- ============================================
CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  category TEXT CHECK (category IN ('technical','tool','framework','language','soft')),
  proficiency_level INTEGER CHECK (proficiency_level BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_skills_user ON public.skills(user_id);

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own skills" ON public.skills FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 7. JOB POSTINGS
-- ============================================
CREATE TABLE public.job_postings (
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

-- Performance indexes
CREATE INDEX idx_jobs_active ON public.job_postings(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_jobs_country_active ON public.job_postings(country, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_jobs_first_seen ON public.job_postings(first_seen_at DESC) WHERE is_active = TRUE;
CREATE INDEX idx_jobs_realness ON public.job_postings(realness_score DESC) WHERE is_active = TRUE;
CREATE INDEX idx_jobs_dedup ON public.job_postings(dedup_hash);
CREATE INDEX idx_jobs_title_trgm ON public.job_postings USING gin(title gin_trgm_ops);
CREATE INDEX idx_jobs_company ON public.job_postings(company_name) WHERE is_active = TRUE;
CREATE INDEX idx_jobs_sponsor ON public.job_postings(sponsorship_status) WHERE is_active = TRUE;
CREATE INDEX idx_jobs_source ON public.job_postings(source_type);

-- Jobs are public read (no RLS needed for SELECT, but INSERT/UPDATE restricted to service role)
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active jobs" ON public.job_postings FOR SELECT USING (is_active = TRUE);

-- ============================================
-- 8. JOB SOURCES (dedup tracking)
-- ============================================
CREATE TABLE public.job_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_url TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_sources_job ON public.job_sources(job_id);

ALTER TABLE public.job_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read job sources" ON public.job_sources FOR SELECT USING (TRUE);

-- ============================================
-- 9. APPLICATIONS
-- ============================================
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.job_postings(id),
  target_profile_id UUID REFERENCES public.target_profiles(id),
  status TEXT NOT NULL DEFAULT 'saved' CHECK (status IN ('saved','resume_ready','applied','hr_screen','technical','behavioral','final','offer','rejected','no_response')),
  applied_at TIMESTAMPTZ,
  resume_recipe_id UUID,
  match_score INTEGER DEFAULT 0 CHECK (match_score BETWEEN 0 AND 100),
  notes TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_apps_user ON public.applications(user_id, created_at DESC);
CREATE INDEX idx_apps_status ON public.applications(user_id, status);
CREATE INDEX idx_apps_job ON public.applications(job_id);
CREATE UNIQUE INDEX idx_apps_user_job ON public.applications(user_id, job_id);

CREATE TRIGGER tr_applications_updated
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own applications" ON public.applications FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 10. RESUME RECIPES
-- ============================================
CREATE TABLE public.resume_recipes (
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

CREATE INDEX idx_recipes_user ON public.resume_recipes(user_id, created_at DESC);
CREATE INDEX idx_recipes_job ON public.resume_recipes(job_id);

ALTER TABLE public.resume_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own recipes" ON public.resume_recipes FOR ALL USING (auth.uid() = user_id);

-- Add FK from applications to resume_recipes
ALTER TABLE public.applications
  ADD CONSTRAINT fk_apps_recipe
  FOREIGN KEY (resume_recipe_id) REFERENCES public.resume_recipes(id);

-- ============================================
-- 11. CONTACTS
-- ============================================
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  linkedin_url TEXT,
  email TEXT,
  connection_status TEXT DEFAULT 'pending' CHECK (connection_status IN ('pending','connected','responded','no_response')),
  last_contacted_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contacts_user ON public.contacts(user_id);
CREATE INDEX idx_contacts_app ON public.contacts(application_id);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own contacts" ON public.contacts FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 12. MESSAGES
-- ============================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tone TEXT NOT NULL CHECK (tone IN ('professional','casual','referral','technical')),
  content TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  got_response BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_contact ON public.messages(contact_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own messages" ON public.messages FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 13. FOLLOW-UPS
-- ============================================
CREATE TABLE public.follow_ups (
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

CREATE INDEX idx_followups_due ON public.follow_ups(user_id, due_date) WHERE is_completed = FALSE;
CREATE INDEX idx_followups_app ON public.follow_ups(application_id);

ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own follow-ups" ON public.follow_ups FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 14. USER SETTINGS
-- ============================================
CREATE TABLE public.user_settings (
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
CREATE POLICY "Users manage own settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 15. WEEKLY USAGE (tier enforcement)
-- ============================================
CREATE TABLE public.weekly_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  applications_count INTEGER NOT NULL DEFAULT 0,
  resumes_generated INTEGER NOT NULL DEFAULT 0,
  messages_generated INTEGER NOT NULL DEFAULT 0,
  cover_letters_generated INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_usage_user_week ON public.weekly_usage(user_id, week_start);

ALTER TABLE public.weekly_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own usage" ON public.weekly_usage FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- 16. RATE LIMIT LOG
-- ============================================
CREATE TABLE public.rate_limit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ratelimit_user_action ON public.rate_limit_log(user_id, action, created_at DESC);

-- Auto-cleanup old rate limit logs (older than 24h)
CREATE OR REPLACE FUNCTION cleanup_rate_limit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rate_limit_log WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 17. AUTO-CREATE USER RECORD ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  
  INSERT INTO public.weekly_usage (user_id, week_start)
  VALUES (NEW.id, DATE_TRUNC('week', NOW())::DATE);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 18. HELPER FUNCTION: Get or create weekly usage
-- ============================================
CREATE OR REPLACE FUNCTION get_weekly_usage(p_user_id UUID)
RETURNS public.weekly_usage AS $$
DECLARE
  v_week_start DATE := DATE_TRUNC('week', NOW())::DATE;
  v_usage public.weekly_usage;
BEGIN
  SELECT * INTO v_usage FROM public.weekly_usage
  WHERE user_id = p_user_id AND week_start = v_week_start;
  
  IF NOT FOUND THEN
    INSERT INTO public.weekly_usage (user_id, week_start)
    VALUES (p_user_id, v_week_start)
    RETURNING * INTO v_usage;
  END IF;
  
  RETURN v_usage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 19. HELPER FUNCTION: Increment usage counter
-- ============================================
CREATE OR REPLACE FUNCTION increment_usage(p_user_id UUID, p_field TEXT)
RETURNS void AS $$
DECLARE
  v_week_start DATE := DATE_TRUNC('week', NOW())::DATE;
BEGIN
  -- Whitelist allowed field names to prevent injection via dynamic SQL
  IF p_field NOT IN ('applications_count', 'resumes_generated', 'messages_generated', 'cover_letters_generated') THEN
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