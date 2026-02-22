// supabase/functions/fetch-nyt-bestsellers/index.ts
// Deno / Supabase Edge Function
// Fetches NYT weekly bestsellers, enriches with Google Books covers,
// generates Amazon links, and upserts into weekly_trending_books.
// Runs every Sunday midnight UTC via pg_cron.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// NYT lists to fetch (up to 2 so we have variety; Fiction + Non-Fiction)
const NYT_LISTS = ['hardcover-fiction', 'hardcover-nonfiction'];
const NYT_BASE  = 'https://api.nytimes.com/svc/books/v3/lists/current';

// Google Books API
const GOOGLE_BOOKS_BASE = 'https://www.googleapis.com/books/v1/volumes';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Get Monday of the current week (UTC) — used as week_start */
function getWeekStart(): string {
    const now = new Date();
    const day = now.getUTCDay(); // 0 = Sunday
    const diff = day === 0 ? -6 : 1 - day; // Monday
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() + diff);
    return monday.toISOString().split('T')[0];
}

/** Build Amazon search URL from ISBN or title */
function buildAmazonUrl(isbn: string | null, title: string): string {
    if (isbn) {
        return `https://www.amazon.com/dp/${isbn}`;
    }
    return `https://www.amazon.com/s?k=${encodeURIComponent(title)}`;
}

/** Fetch cover image URL from Google Books using ISBN */
async function fetchGoogleBooksCover(
    isbn: string | null,
    title: string,
    author: string,
    googleKey: string | undefined,
): Promise<string | null> {
    try {
        const query = isbn
            ? `isbn:${isbn}`
            : `intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}`;

        const url = googleKey
            ? `${GOOGLE_BOOKS_BASE}?q=${query}&key=${googleKey}&maxResults=1`
            : `${GOOGLE_BOOKS_BASE}?q=${query}&maxResults=1`;

        const res = await fetch(url);
        if (!res.ok) return null;

        const json = await res.json();
        const imageLinks = json.items?.[0]?.volumeInfo?.imageLinks;
        if (!imageLinks) return null;

        // Prefer large thumbnail, fall back to thumbnail
        const raw = imageLinks.extraLarge || imageLinks.large || imageLinks.medium || imageLinks.thumbnail;
        if (!raw) return null;

        // Force HTTPS
        return raw.replace('http://', 'https://');
    } catch {
        return null;
    }
}

/** Fetch one NYT list */
async function fetchNYTList(listName: string, nytKey: string): Promise<NytBook[]> {
    const url = `${NYT_BASE}/${listName}.json?api-key=${nytKey}`;
    const res = await fetch(url);

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`NYT API error for ${listName}: ${res.status} ${err}`);
    }

    const json = await res.json();
    return (json.results?.books || []) as NytBook[];
}

interface NytBook {
    rank: number;
    title: string;
    author: string;
    description: string;
    publisher: string;
    primary_isbn13: string;
    primary_isbn10: string;
    book_image: string;
    amazon_product_url: string;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: CORS_HEADERS });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const nytKey      = Deno.env.get('NYT_BOOKS_API_KEY');
    const googleKey   = Deno.env.get('GOOGLE_BOOKS_API_KEY'); // optional

    if (!nytKey) {
        return new Response(
            JSON.stringify({ ok: false, error: 'NYT_BOOKS_API_KEY not set' }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
        );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
    });

    const weekStart = getWeekStart();
    console.log(`Fetching NYT bestsellers for week starting ${weekStart}`);

    // ── Parse optional body to allow overriding lists ────────────────────────
    let listsToFetch = NYT_LISTS;
    try {
        const body = await req.json().catch(() => ({}));
        if (Array.isArray(body.lists) && body.lists.length > 0) {
            listsToFetch = body.lists;
        }
    } catch { /* use defaults */ }

    const inserted: object[] = [];
    const errors: string[] = [];

    for (const listName of listsToFetch) {
        try {
            console.log(`Fetching list: ${listName}`);
            const nytBooks = await fetchNYTList(listName, nytKey);

            // Delete previous weeks' entries for this list (keep current week)
            await supabase
                .from('weekly_trending_books')
                .delete()
                .eq('list_name', listName)
                .neq('week_start', weekStart);

            // Enrich and upsert books (process up to 10 per list to avoid timeouts)
            const books = nytBooks.slice(0, 10);

            for (const book of books) {
                const isbn = book.primary_isbn13 || book.primary_isbn10 || null;

                // Use NYT's own image first; fall back to Google Books
                let imageUrl = book.book_image || null;
                if (!imageUrl || imageUrl.includes('no_image')) {
                    imageUrl = await fetchGoogleBooksCover(isbn, book.title, book.author, googleKey);
                }

                // Use NYT Amazon URL if available, otherwise build one
                const amazonUrl = book.amazon_product_url || buildAmazonUrl(isbn, book.title);

                const row = {
                    title:       book.title,
                    author:      book.author,
                    isbn:        isbn,
                    image_url:   imageUrl,
                    amazon_url:  amazonUrl,
                    description: book.description || null,
                    rank:        book.rank,
                    list_name:   listName,
                    publisher:   book.publisher || null,
                    week_start:  weekStart,
                };

                const { data, error: upsertErr } = await supabase
                    .from('weekly_trending_books')
                    .upsert(row, {
                        onConflict: isbn ? 'isbn,week_start,list_name' : undefined,
                        ignoreDuplicates: false,
                    })
                    .select('id')
                    .single();

                if (upsertErr) {
                    console.error(`Upsert error for "${book.title}":`, upsertErr);
                    errors.push(`${book.title}: ${upsertErr.message}`);
                } else {
                    inserted.push({ id: data?.id, title: book.title, rank: book.rank, list: listName });
                }
            }

            console.log(`✅ Finished ${listName}: ${books.length} books`);
        } catch (err) {
            const msg = String(err);
            console.error(`Error processing ${listName}:`, msg);
            errors.push(`${listName}: ${msg}`);
        }
    }

    return new Response(
        JSON.stringify({
            ok: errors.length === 0,
            week_start: weekStart,
            inserted_count: inserted.length,
            errors: errors.length > 0 ? errors : undefined,
            books: inserted,
        }),
        { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    );
});
