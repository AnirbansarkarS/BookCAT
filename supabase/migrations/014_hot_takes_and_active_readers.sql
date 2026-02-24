-- ============================================================
-- 014: Hot Takes, Active Readers, and reading_sessions fixes
-- ============================================================

-- ── 1. Add missing columns to reading_sessions ──────────────
ALTER TABLE public.reading_sessions
    ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS intent TEXT;

-- ── 2. Daily Hot Takes (Groq-generated) ─────────────────────
CREATE TABLE IF NOT EXISTS public.daily_hot_takes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    take_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    take_text       TEXT NOT NULL,
    topic           TEXT NOT NULL,        -- e.g. "e-readers", "audiobooks"
    category        TEXT NOT NULL CHECK (category IN (
                        'reading_habits', 'book_industry', 'pricing',
                        'technology', 'culture', 'debates'
                    )),
    agree_count     INTEGER DEFAULT 0,
    disagree_count  INTEGER DEFAULT 0,
    generated_at    TIMESTAMPTZ DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_hot_takes_date
    ON public.daily_hot_takes (take_date DESC);

ALTER TABLE public.daily_hot_takes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hot takes are publicly readable"
    ON public.daily_hot_takes FOR SELECT USING (true);

CREATE POLICY "Service role manages hot takes"
    ON public.daily_hot_takes FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Allow authenticated users to update agree/disagree counts
CREATE POLICY "Authenticated users can vote"
    ON public.daily_hot_takes FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- ── 3. Hot Take Votes (per-user tracking) ───────────────────
CREATE TABLE IF NOT EXISTS public.hot_take_votes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    hot_take_id     UUID REFERENCES public.daily_hot_takes(id) ON DELETE CASCADE NOT NULL,
    vote            TEXT NOT NULL CHECK (vote IN ('agree', 'disagree')),
    created_at      TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(user_id, hot_take_id)
);

ALTER TABLE public.hot_take_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view votes"
    ON public.hot_take_votes FOR SELECT USING (true);

CREATE POLICY "Users can insert own votes"
    ON public.hot_take_votes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own votes"
    ON public.hot_take_votes FOR UPDATE
    USING (auth.uid() = user_id);

-- ── 4. Realtime Active Readers function ─────────────────────
CREATE OR REPLACE FUNCTION get_active_readers(limit_count INTEGER DEFAULT 8)
RETURNS TABLE (
    user_id         UUID,
    username        TEXT,
    avatar_url      TEXT,
    book_title      TEXT,
    book_cover      TEXT,
    book_progress   INTEGER,
    last_session_at TIMESTAMPTZ,
    total_today_seconds INTEGER
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT
        rs.user_id,
        p.username,
        p.avatar_url,
        b.title         AS book_title,
        b.cover_url     AS book_cover,
        b.progress      AS book_progress,
        MAX(rs.created_at) AS last_session_at,
        COALESCE(SUM(rs.duration_seconds), 0)::INTEGER AS total_today_seconds
    FROM public.reading_sessions rs
    JOIN public.profiles p ON p.id = rs.user_id
    JOIN public.books b ON b.id = rs.book_id
    WHERE rs.created_at > NOW() - INTERVAL '24 hours'
    GROUP BY rs.user_id, p.username, p.avatar_url, b.title, b.cover_url, b.progress
    ORDER BY MAX(rs.created_at) DESC
    LIMIT limit_count;
$$;
