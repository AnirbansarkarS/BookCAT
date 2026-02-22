-- ============================================================
-- Daily Quiz Engine
-- ============================================================

-- ── daily_quiz: one row per day ───────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_quiz (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- One quiz per calendar day (UTC)
    quiz_date       DATE NOT NULL UNIQUE,

    -- Book context
    book_title      TEXT NOT NULL,
    book_author     TEXT,
    cover_url       TEXT,

    -- AI-generated question
    question_type   TEXT NOT NULL CHECK (question_type IN (
                        'quote', 'author', 'genre', 'era', 'plot', 'trivia'
                    )),
    question        TEXT NOT NULL,

    -- Exactly 4 options stored as JSON array of strings
    options         JSONB NOT NULL,            -- ["Option A","Option B","Option C","Option D"]
    correct_answer  SMALLINT NOT NULL          -- 0-based index into options array
                        CHECK (correct_answer BETWEEN 0 AND 3),
    explanation     TEXT,                      -- shown after answering

    generated_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ── user_quiz_answers: one row per user per quiz ──────────
CREATE TABLE IF NOT EXISTS public.user_quiz_answers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    quiz_id         UUID NOT NULL REFERENCES public.daily_quiz(id) ON DELETE CASCADE,
    selected_answer SMALLINT NOT NULL CHECK (selected_answer BETWEEN 0 AND 3),
    is_correct      BOOLEAN NOT NULL,
    answered_at     TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),

    UNIQUE (user_id, quiz_id)   -- one answer per user per quiz
);

-- ── Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_daily_quiz_date
    ON public.daily_quiz (quiz_date DESC);

CREATE INDEX IF NOT EXISTS idx_user_quiz_answers_user
    ON public.user_quiz_answers (user_id, answered_at DESC);

-- ── RLS ───────────────────────────────────────────────────
ALTER TABLE public.daily_quiz         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quiz_answers  ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read quizzes
CREATE POLICY "Quizzes are public"
    ON public.daily_quiz FOR SELECT
    USING (true);

-- Only service role can insert/update quizzes (Edge Function)
CREATE POLICY "Service role manages quizzes"
    ON public.daily_quiz FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Users can read all answers (for leaderboard etc.)
CREATE POLICY "Quiz answers are readable"
    ON public.user_quiz_answers FOR SELECT
    USING (true);

-- Users can insert their own answer only
CREATE POLICY "Users insert own answer"
    ON public.user_quiz_answers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ── Helper view: today's quiz with answer count ────────────
CREATE OR REPLACE VIEW public.today_quiz AS
SELECT
    q.*,
    COUNT(a.id)                                    AS total_answers,
    COUNT(a.id) FILTER (WHERE a.is_correct)        AS correct_count
FROM public.daily_quiz q
LEFT JOIN public.user_quiz_answers a ON a.quiz_id = q.id
WHERE q.quiz_date = CURRENT_DATE
GROUP BY q.id;
