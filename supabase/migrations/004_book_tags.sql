-- Add tags to books table for library organization
ALTER TABLE public.books
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::text[];

-- Optional index for faster tag filtering
CREATE INDEX IF NOT EXISTS idx_books_tags ON public.books USING GIN (tags);
