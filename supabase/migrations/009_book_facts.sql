-- ============================================================
-- Book Fact of the Day
-- Stores up to 2 AI-generated book facts per day
-- ============================================================

CREATE TABLE IF NOT EXISTS public.daily_book_facts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fact_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    fact_text       TEXT NOT NULL,
    book_title      TEXT,
    book_author     TEXT,
    category        TEXT NOT NULL CHECK (category IN (
                        'history', 'author', 'publishing', 'adaptation',
                        'record', 'trivia', 'origin', 'influence'
                    )),
    emoji           TEXT,           -- e.g. "📚", "✍️"
    generated_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Max 2 facts per day enforced by a partial unique index trick:
-- We allow at most 2 rows per fact_date via application logic + a check in the Edge Function.

CREATE INDEX IF NOT EXISTS idx_daily_book_facts_date
    ON public.daily_book_facts (fact_date DESC);

-- ── RLS ───────────────────────────────────────────────────
ALTER TABLE public.daily_book_facts ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read facts
CREATE POLICY "Facts are public"
    ON public.daily_book_facts FOR SELECT
    USING (true);

-- Only service role can insert/update (Edge Function)
CREATE POLICY "Service role manages facts"
    ON public.daily_book_facts FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
