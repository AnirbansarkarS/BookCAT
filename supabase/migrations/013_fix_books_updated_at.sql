-- Fix: The updated_at column was dropped from the books table but the
-- trigger set_books_updated_at still fires and references NEW.updated_at,
-- causing every UPDATE to fail with:
--   record "new" has no field "updated_at"
--
-- Solution: Ensure the handle_updated_at function exists, then re-add the column.

-- 1. Create the handle_updated_at function if it doesn't already exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Re-add the updated_at column (IF NOT EXISTS prevents error if it's already there)
ALTER TABLE public.books
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- 3. Drop and recreate the trigger to be safe
DROP TRIGGER IF EXISTS set_books_updated_at ON public.books;

CREATE TRIGGER set_books_updated_at
    BEFORE UPDATE ON public.books
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
