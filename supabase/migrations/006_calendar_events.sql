-- ============================================
-- KARMIO MIGRATION 006 — Calendar Events
-- User-managed events: interviews, assessments,
-- deadlines, todos, prep sessions
-- ============================================

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('interview','assessment','deadline','todo','prep','follow_up','other')),
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