-- Add page tracking columns to books table
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS total_pages INTEGER,
ADD COLUMN IF NOT EXISTS current_page INTEGER DEFAULT 0;

-- Create reading_sessions table
CREATE TABLE IF NOT EXISTS public.reading_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER DEFAULT 0,
    pages_read INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for reading_sessions
ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for reading_sessions
CREATE POLICY "Users can view their own reading sessions"
    ON public.reading_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reading sessions"
    ON public.reading_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reading sessions"
    ON public.reading_sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reading sessions"
    ON public.reading_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- Create index for faster stats queries
CREATE INDEX idx_reading_sessions_user_book ON public.reading_sessions(user_id, book_id);
CREATE INDEX idx_reading_sessions_created_at ON public.reading_sessions(created_at);
