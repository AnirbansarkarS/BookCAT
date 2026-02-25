-- ============================================================
-- 017: Ensure messages.read_at exists and messages table is live
-- Safe to run even if 016 was already applied.
-- ============================================================

-- Re-create messages table only if it does not exist yet
-- (016 may not have been applied to the remote project)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    CHECK (sender_id != receiver_id)
);

-- Add read_at column if it was somehow omitted from an earlier partial migration
ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Indexes (safe no-ops if they already exist)
CREATE INDEX IF NOT EXISTS idx_messages_sender      ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver    ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at  ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread      ON public.messages(receiver_id)
    WHERE read_at IS NULL;

-- RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop and re-create policies idempotently
DROP POLICY IF EXISTS "Users can view their messages"       ON public.messages;
DROP POLICY IF EXISTS "Users can send messages"             ON public.messages;
DROP POLICY IF EXISTS "Users can mark messages as read"     ON public.messages;

CREATE POLICY "Users can view their messages"
    ON public.messages FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
    ON public.messages FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can mark messages as read"
    ON public.messages FOR UPDATE
    USING (auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = receiver_id);

-- Realtime (safe if already added)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
