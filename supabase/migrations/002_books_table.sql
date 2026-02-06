-- Create books table
CREATE TABLE IF NOT EXISTS public.books (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    isbn TEXT,
    title TEXT NOT NULL,
    authors TEXT,
    cover_url TEXT,
    published_year TEXT,
    description TEXT,
    status TEXT DEFAULT 'Want to Read' CHECK (status IN ('Reading', 'Want to Read', 'Completed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'scan')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, isbn)
);

-- Enable Row Level Security
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can only view their own books
CREATE POLICY "Users can view their own books"
    ON public.books
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own books
CREATE POLICY "Users can insert their own books"
    ON public.books
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own books
CREATE POLICY "Users can update their own books"
    ON public.books
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own books
CREATE POLICY "Users can delete their own books"
    ON public.books
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER set_books_updated_at
    BEFORE UPDATE ON public.books
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Create index for faster queries
CREATE INDEX idx_books_user_id ON public.books(user_id);
CREATE INDEX idx_books_isbn ON public.books(isbn);
