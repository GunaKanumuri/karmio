-- Karmio v2.3 — Interview Prep Enhancement

CREATE TABLE IF NOT EXISTS prep_practice (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  answer_draft text DEFAULT '',
  confidence text DEFAULT 'not_started' CHECK (confidence IN ('not_started', 'practiced', 'confident')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, question_key)
);

CREATE INDEX IF NOT EXISTS idx_prep_practice_user ON prep_practice(user_id);

ALTER TABLE prep_practice ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own prep" ON prep_practice FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own prep" ON prep_practice FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own prep" ON prep_practice FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own prep" ON prep_practice FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS mock_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
  stage text NOT NULL CHECK (stage IN ('hr', 'technical', 'behavioral', 'offer')),
  messages jsonb DEFAULT '[]'::jsonb,
  summary_feedback jsonb DEFAULT '{}'::jsonb,
  question_count integer DEFAULT 0,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mock_sessions_user ON mock_sessions(user_id, created_at DESC);

ALTER TABLE mock_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sessions" ON mock_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON mock_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON mock_sessions FOR UPDATE USING (auth.uid() = user_id);