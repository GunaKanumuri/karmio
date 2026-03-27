-- ============================================
-- KARMIO MIGRATION 005 — Resume/Profile/Network Sync
-- Fixes: career columns, skills constraint, outreach table,
--        contacts nullable FK, country constraint, target_countries
-- ============================================

-- 1. Add career columns to target_profiles (Gap 4)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='target_profiles' AND column_name='career_stage') THEN
    ALTER TABLE public.target_profiles ADD COLUMN career_stage TEXT CHECK (career_stage IN ('student','early','mid','senior','executive'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='target_profiles' AND column_name='career_field') THEN
    ALTER TABLE public.target_profiles ADD COLUMN career_field TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='target_profiles' AND column_name='job_types') THEN
    ALTER TABLE public.target_profiles ADD COLUMN job_types TEXT[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='target_profiles' AND column_name='company_types') THEN
    ALTER TABLE public.target_profiles ADD COLUMN company_types TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- 2. Add UNIQUE on skills (user_id, skill_name) (Gap 5)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_skills_user_name_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_skills_user_name_unique ON public.skills(user_id, skill_name);
  END IF;
END $$;

-- 3. Add skill_category alias column if missing (Gap 5 column mismatch)
-- The save API writes 'skill_category' but DB has 'category'
-- Fix: rename to match what the code expects
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='skills' AND column_name='category')
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='skills' AND column_name='skill_category') THEN
    ALTER TABLE public.skills RENAME COLUMN category TO skill_category;
  END IF;
END $$;

-- Also rename proficiency_level to proficiency if the save API expects it
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='skills' AND column_name='proficiency_level')
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='skills' AND column_name='proficiency') THEN
    ALTER TABLE public.skills RENAME COLUMN proficiency_level TO proficiency;
  END IF;
END $$;

-- 4. Widen country constraint on users (Gap 3)
DO $$
DECLARE cname TEXT;
BEGIN
  SELECT conname INTO cname FROM pg_constraint
  WHERE conrelid = 'public.users'::regclass AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%country%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT %I', cname);
  END IF;
END $$;
ALTER TABLE public.users ADD CONSTRAINT users_country_check CHECK (country ~ '^[A-Z]{2}$');

-- 5. Add target_countries to users (Gap 11)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='target_countries') THEN
    ALTER TABLE public.users ADD COLUMN target_countries TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- 6. Widen country constraint on job_postings if it exists (Gap 3)
DO $$
DECLARE cname TEXT;
BEGIN
  SELECT conname INTO cname FROM pg_constraint
  WHERE conrelid = 'public.job_postings'::regclass AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%country%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.job_postings DROP CONSTRAINT %I', cname);
  END IF;
END $$;
ALTER TABLE public.job_postings ADD CONSTRAINT job_postings_country_check CHECK (country ~ '^[A-Z]{2}$');

-- 7. Make contacts.application_id nullable (Gap 7)
ALTER TABLE public.contacts ALTER COLUMN application_id DROP NOT NULL;

-- Add extra columns to contacts for auto-suggested contacts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='company') THEN
    ALTER TABLE public.contacts ADD COLUMN company TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='source') THEN
    ALTER TABLE public.contacts ADD COLUMN source TEXT DEFAULT 'manual' CHECK (source IN ('manual','auto_suggested','imported'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='role_type') THEN
    ALTER TABLE public.contacts ADD COLUMN role_type TEXT CHECK (role_type IN ('hr','recruiter','hiring_manager','engineer','other'));
  END IF;
END $$;

-- 8. Create outreach_suggestions table (Gap 6)
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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_outreach_user') THEN
    CREATE INDEX idx_outreach_user ON public.outreach_suggestions(user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_outreach_app') THEN
    CREATE INDEX idx_outreach_app ON public.outreach_suggestions(application_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_outreach_status') THEN
    CREATE INDEX idx_outreach_status ON public.outreach_suggestions(user_id, outreach_status);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_outreach_updated') THEN
    CREATE TRIGGER tr_outreach_updated
      BEFORE UPDATE ON public.outreach_suggestions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

ALTER TABLE public.outreach_suggestions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='outreach_suggestions' AND policyname='Users manage own outreach') THEN
    CREATE POLICY "Users manage own outreach" ON public.outreach_suggestions FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- 9. Add outreach tracking + stage timing to applications
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='outreach_status') THEN
    ALTER TABLE public.applications ADD COLUMN outreach_status TEXT DEFAULT 'none'
      CHECK (outreach_status IN ('none','pending','sent','followed_up','responded'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='stage_entered_at') THEN
    ALTER TABLE public.applications ADD COLUMN stage_entered_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- 10. Add project_category to projects if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='project_category') THEN
    ALTER TABLE public.projects ADD COLUMN project_category TEXT DEFAULT 'side'
      CHECK (project_category IN ('side','academic','professional','hackathon','opensource'));
  END IF;
END $$;