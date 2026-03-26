-- ============================================
-- KARMIO MIGRATION 004
-- Job lifecycle management + discovery support
-- Run after 003_company_details.sql
-- ============================================

-- 1. Cleanup RPC: Hard-delete old inactive jobs with no applications
CREATE OR REPLACE FUNCTION public.cleanup_old_jobs(cutoff_date TIMESTAMPTZ)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.job_postings
  WHERE is_active = FALSE
    AND last_seen_at < cutoff_date
    AND id NOT IN (
      SELECT DISTINCT job_id FROM public.applications
    );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 2. Index for company_details discovery queries
CREATE INDEX IF NOT EXISTS idx_company_active_stale
  ON public.company_details(last_fetched_at ASC)
  WHERE open_roles_count > 0 AND fetch_error IS NULL;

-- 3. Add company_domain column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_details' AND column_name = 'company_domain'
  ) THEN
    ALTER TABLE public.company_details ADD COLUMN company_domain TEXT;
  END IF;
END $$;

-- 4. Composite index for today's jobs query
CREATE INDEX IF NOT EXISTS idx_jobs_today_query
  ON public.job_postings(country, first_seen_at DESC)
  WHERE is_active = TRUE;

-- 5. RLS policy for service role writes to company_details
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'company_details' AND policyname = 'Service role can manage company details'
  ) THEN
    CREATE POLICY "Service role can manage company details"
      ON public.company_details
      FOR ALL
      USING (TRUE)
      WITH CHECK (TRUE);
  END IF;
END $$;

-- 6. RLS policy for service role writes to job_fetch_log
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'job_fetch_log' AND policyname = 'Service role can manage fetch logs'
  ) THEN
    CREATE POLICY "Service role can manage fetch logs"
      ON public.job_fetch_log
      FOR ALL
      USING (TRUE)
      WITH CHECK (TRUE);
  END IF;
END $$;

-- 7. Add notes column to job_fetch_log if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_fetch_log' AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.job_fetch_log ADD COLUMN notes TEXT;
  END IF;
END $$;