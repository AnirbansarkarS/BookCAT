// supabase/functions/fetch-nyt-bestsellers/index.ts
// Deno / Supabase Edge Function
// Strategy: Try NYT overview endpoint first. If it fails (401/403/etc),
// fall back to Google Books API to fetch popular books by category.
// Covers always come from Google Books. Amazon links built from ISBN.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NYT_OVERVIEW = 'https://api.nytimes.com/svc/books/v3/lists/overview.json';
const GOOGLE_BOOKS_BASE = 'https://www.googleapis.com/books/v1/volumes';

// Category queries for Google Books fallback (maps list_name → search query)
const GOOGLE_FALLBACK_QUERIES: Record<string, string> = {
    'hardcover-fiction':      'subject:fiction&orderBy=newest&langRestrict=en',
    'hardcover-nonfiction':   'subject:nonfiction&orderBy=newest&langRestrict=en',
    'young-adult-hardcover':  'subject:young+adult&orderBy=newest&langRestrict=en',
    'paperback-nonfiction':   'subject:biography&orderBy=newest&langRestrict=en',
};

const WANTED_LISTS = new Set(Object.keys(GOOGLE_FALLBACK_QUERIES));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildAmazonUrl(isbn: string | null, title: string): string {
    if (isbn) return `https://www.amazon.com/dp/${isbn}`;
    return `https://www.amazon.com/s?k=${encodeURIComponent(title)}`;
}

function getGoogleCoverFromItem(item: any): string | null {
    const imageLinks = item?.volumeInfo?.imageLinks;
    if (!imageLinks) return null;
    const raw = imageLinks.extraLarge || imageLinks.large || imageLinks.medium
        || imageLinks.small || imageLinks.thumbnail;
    return raw ? raw.replace('http://', 'https://') : null;
}

async function fetchGoogleBooksCover(
    isbn: string | null, title: string, author: string, googleKey?: string,
): Promise<string | null> {
    try {
        const q = isbn
            ? `isbn:${isbn}`
            : `intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}`;
        const url = googleKey
            ? `${GOOGLE_BOOKS_BASE}?q=${q}&key=${googleKey}&maxResults=1`
            : `${GOOGLE_BOOKS_BASE}?q=${q}&maxResults=1`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const json = await res.json();
        return getGoogleCoverFromItem(json.items?.[0]);
    } catch { return null; }
}

// ─── Google Books Fallback ───────────────────────────────────────────────────

interface FallbackBook {
    title: string;
    author: string;
    isbn: string | null;
    image_url: string | null;
    description: string | null;
    publisher: string | null;
    rank: number;
}

async function fetchGoogleBooksForCategory(
    query: string, googleKey?: string, maxResults = 15,
): Promise<FallbackBook[]> {
    try {
        const url = googleKey
            ? `${GOOGLE_BOOKS_BASE}?q=${query}&key=${googleKey}&maxResults=${maxResults}&printType=books`
            : `${GOOGLE_BOOKS_BASE}?q=${query}&maxResults=${maxResults}&printType=books`;

        const res = await fetch(url);
        if (!res.ok) {
            console.error('Google Books API error:', res.status);
            return [];
        }

        const json = await res.json();
        const items = json.items || [];

        return items.map((item: any, idx: number) => {
            const vol = item.volumeInfo || {};
            const ids = vol.industryIdentifiers || [];
            const isbn13 = ids.find((i: any) => i.type === 'ISBN_13')?.identifier || null;
            const isbn10 = ids.find((i: any) => i.type === 'ISBN_10')?.identifier || null;
            const isbn = isbn13 || isbn10 || null;

            return {
                title: vol.title || 'Unknown Title',
                author: (vol.authors || []).join(', ') || 'Unknown Author',
                isbn,
                image_url: getGoogleCoverFromItem(item),
                description: vol.description ? vol.description.substring(0, 500) : null,
                publisher: vol.publisher || null,
                rank: idx + 1,
            };
        });
    } catch (err) {
        console.error('Google Books fallback error:', err);
        return [];
    }
}

// ─── NYT types ───────────────────────────────────────────────────────────────

interface NytOverviewList {
    list_name_encoded: string;
    display_name: string;
    books: NytBook[];
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

    const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
    });

    // ── Parse optional body ──────────────────────────────────────────────────
    let wantedLists = WANTED_LISTS;
    try {
        const body = await req.json().catch(() => ({}));
        if (Array.isArray(body.lists) && body.lists.length > 0) {
            wantedLists = new Set(body.lists as string[]);
        }
    } catch { /* defaults */ }

    const today = new Date().toISOString().split('T')[0];
    let source = 'google-books'; // track which source we used
    let publishedDate = today;

    // ── 1. Try NYT first ─────────────────────────────────────────────────────
    interface ProcessableList {
        listName: string;
        books: FallbackBook[];
    }

    const listsToProcess: ProcessableList[] = [];
    let nytSuccess = false;

    if (nytKey) {
        console.log('Trying NYT overview endpoint...');
        try {
            const overviewRes = await fetch(`${NYT_OVERVIEW}?api-key=${nytKey}`);

            if (overviewRes.ok) {
                const overviewJson = await overviewRes.json();
                const allLists = (overviewJson.results?.lists || []) as NytOverviewList[];
                publishedDate = overviewJson.results?.published_date || today;

                const targetLists = allLists.filter(l => wantedLists.has(l.list_name_encoded));
                console.log(`NYT success! ${targetLists.length} lists, published ${publishedDate}`);

                for (const list of targetLists) {
                    const books: FallbackBook[] = list.books.slice(0, 15).map(b => ({
                        title: b.title,
                        author: b.author,
                        isbn: b.primary_isbn13 || b.primary_isbn10 || null,
                        image_url: null, // will fetch from Google Books below
                        description: b.description || null,
                        publisher: b.publisher || null,
                        rank: b.rank,
                    }));
                    listsToProcess.push({ listName: list.list_name_encoded, books });
                }

                nytSuccess = true;
                source = 'nyt';
            } else {
                const errText = await overviewRes.text();
                console.warn(`NYT API returned ${overviewRes.status}, falling back to Google Books. Error: ${errText}`);
            }
        } catch (err) {
            console.warn('NYT fetch failed, falling back to Google Books:', err);
        }
    } else {
        console.log('No NYT_BOOKS_API_KEY set, using Google Books fallback');
    }

    // ── 2. Google Books fallback (if NYT failed) ─────────────────────────────
    if (!nytSuccess) {
        console.log('Using Google Books API as primary source...');
        for (const listName of wantedLists) {
            const query = GOOGLE_FALLBACK_QUERIES[listName];
            if (!query) continue;

            const books = await fetchGoogleBooksForCategory(query, googleKey);
            if (books.length > 0) {
                listsToProcess.push({ listName, books });
                console.log(`Google Books: ${listName} → ${books.length} books`);
            }
        }
    }

    if (listsToProcess.length === 0) {
        return new Response(
            JSON.stringify({ ok: false, error: 'No books fetched from any source', source }),
            { status: 502, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
        );
    }

    // ── 3. Delete old entries ────────────────────────────────────────────────
    const { error: deleteErr } = await supabase
        .from('weekly_trending_books')
        .delete()
        .neq('week_start', publishedDate);

    if (deleteErr) console.warn('Delete old entries warning:', deleteErr.message);

    // ── 4. Enrich covers + upsert ───────────────────────────────────────────
    const inserted: object[] = [];
    const errors: string[] = [];

    for (const { listName, books } of listsToProcess) {
        for (const book of books) {
            try {
                // Get cover from Google Books API
                const imageUrl = book.image_url
                    || await fetchGoogleBooksCover(book.isbn, book.title, book.author, googleKey);

                const amazonUrl = buildAmazonUrl(book.isbn, book.title);

                const row = {
                    title:       book.title,
                    author:      book.author,
                    isbn:        book.isbn,
                    image_url:   imageUrl,
                    amazon_url:  amazonUrl,
                    description: book.description,
                    rank:        book.rank,
                    list_name:   listName,
                    publisher:   book.publisher,
                    week_start:  publishedDate,
                };

                // Try upsert (works when ISBN is not null)
                const { data, error: upsertErr } = await supabase
                    .from('weekly_trending_books')
                    .upsert(row, { onConflict: 'isbn,week_start,list_name', ignoreDuplicates: false })
                    .select('id')
                    .maybeSingle();

                if (upsertErr) {
                    // Fallback: plain insert (e.g. null ISBN)
                    const { data: iData, error: iErr } = await supabase
                        .from('weekly_trending_books')
                        .insert(row)
                        .select('id')
                        .maybeSingle();

                    if (iErr) {
                        errors.push(`${book.title}: ${iErr.message}`);
                    } else {
                        inserted.push({ id: iData?.id, title: book.title, rank: book.rank, list: listName });
                    }
                } else {
                    inserted.push({ id: data?.id, title: book.title, rank: book.rank, list: listName });
                }
            } catch (err) {
                errors.push(`${book.title}: ${String(err)}`);
            }
        }
        console.log(`✅ ${listName}: processed ${books.length} books`);
    }

    return new Response(
        JSON.stringify({
            ok: errors.length === 0,
            source,
            published_date: publishedDate,
            lists_processed: listsToProcess.map(l => l.listName),
            inserted_count: inserted.length,
            errors: errors.length > 0 ? errors : undefined,
            books: inserted,
        }),
        { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    );
});
