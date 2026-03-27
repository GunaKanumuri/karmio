-- ============================================
-- KARMIO MIGRATION 004 — Outreach & Network Enhancement
-- Adds outreach_suggestions table, updates contacts
-- ============================================

-- 1. OUTREACH SUGGESTIONS
-- Auto-generated when user applies to a job
-- Contains suggested people to reach out to + drafted messages
CREATE TABLE IF NOT EXISTS public.outreach_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  
  -- Company info
  company_name TEXT NOT NULL,
  company_domain TEXT,
  company_linkedin_url TEXT,
  
  -- Suggested contacts (auto-discovered or role-based guidance)
  suggested_roles JSONB NOT NULL DEFAULT '[]',
  -- Format: [{ role: "Technical Recruiter", name?: "Jane Smith", linkedin_url?: "...", email?: "...", source: "discovered" | "suggested" }]
  
  -- Draft messages
  hr_draft TEXT,
  technical_draft TEXT,
  
  -- Guidance (shown when no specific contacts found)
  search_guidance TEXT,
  linkedin_search_url TEXT,
  
  -- Workflow status
  outreach_status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (outreach_status IN ('pending','message_drafted','sent','followed_up','responded','interview_scheduled')),
  
  sent_at TIMESTAMPTZ,
  response_at TIMESTAMPTZ,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outreach_user ON public.outreach_suggestions(user_id);
CREATE INDEX idx_outreach_app ON public.outreach_suggestions(application_id);
CREATE INDEX idx_outreach_status ON public.outreach_suggestions(user_id, outreach_status);

CREATE TRIGGER tr_outreach_updated
  BEFORE UPDATE ON public.outreach_suggestions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.outreach_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own outreach" ON public.outreach_suggestions FOR ALL USING (auth.uid() = user_id);

-- 2. Make contacts.application_id nullable (for contacts not linked to a specific app)
ALTER TABLE public.contacts ALTER COLUMN application_id DROP NOT NULL;

-- 3. Add company field to contacts (for auto-suggested contacts)
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

-- 4. Add outreach tracking to applications
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='outreach_status') THEN
    ALTER TABLE public.applications ADD COLUMN outreach_status TEXT DEFAULT 'none' 
      CHECK (outreach_status IN ('none','pending','sent','followed_up','responded'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='days_in_stage') THEN
    ALTER TABLE public.applications ADD COLUMN stage_entered_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;