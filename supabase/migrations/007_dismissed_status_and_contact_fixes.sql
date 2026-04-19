-- ============================================
-- KARMIO MIGRATION 007
-- Fix: dismissed status, contacts.company_name,
--      contacts independent of application
-- ============================================

-- 1. Add 'dismissed' to applications.status CHECK constraint
--    The dismiss route inserts status='dismissed' to hide jobs from feed.
--    Without this the INSERT will throw a check_violation error.
DO $$
DECLARE cname TEXT;
BEGIN
  SELECT conname INTO cname FROM pg_constraint
  WHERE conrelid = 'public.applications'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status%';

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.applications DROP CONSTRAINT %I', cname);
  END IF;

  ALTER TABLE public.applications
    ADD CONSTRAINT applications_status_check CHECK (
      status IN (
        'saved','resume_ready','applied',
        'hr_screen','technical','behavioral','final',
        'offer','rejected','no_response','dismissed'
      )
    );
END $$;

-- 2. Rename contacts.company → contacts.company_name
--    Migration 004 added a 'company' column but the frontend reads 'company_name'.
--    Rename so they align without requiring frontend changes.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contacts'
      AND column_name = 'company'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contacts'
      AND column_name = 'company_name'
  ) THEN
    ALTER TABLE public.contacts RENAME COLUMN company TO company_name;
  END IF;
END $$;

-- 3. Ensure contacts can exist without an application (networking contacts)
--    Migration 004 dropped NOT NULL on application_id; this is an idempotent guard.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contacts'
      AND column_name = 'application_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.contacts ALTER COLUMN application_id DROP NOT NULL;
  END IF;
END $$;

-- 4. Add last_job_title to contacts if not present
--    The messages page reads contact.last_job_title as a role fallback.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contacts'
      AND column_name = 'last_job_title'
  ) THEN
    ALTER TABLE public.contacts ADD COLUMN last_job_title TEXT;
  END IF;
END $$;
