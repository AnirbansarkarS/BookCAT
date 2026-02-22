// supabase/functions/fetch-publisher-feeds/index.ts
// Deno / Supabase Edge Function
// Fetches RSS feeds from major book publishers, parses XML,
// and upserts articles into the publisher_updates table.
// Scheduled to run every 6 hours via supabase/config.toml cron.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Publisher Feed Registry ────────────────────────────────────────────────
interface FeedConfig {
    publisher: string;
    slug: string;
    feeds: string[];
}

const PUBLISHER_FEEDS: FeedConfig[] = [
    {
        publisher: 'Penguin Random House',
        slug: 'penguin',
        feeds: [
            'https://www.penguinrandomhouse.com/the-read-down/feed/',
            'https://www.penguinrandomhouse.com/news/feed/',
        ],
    },
    {
        publisher: 'HarperCollins',
        slug: 'harpercollins',
        feeds: [
            'https://www.harpercollins.com/blogs/news.atom',
            'https://harpercollinspublishers.tumblr.com/rss',
        ],
    },
    {
        publisher: 'Hachette Book Group',
        slug: 'hachette',
        feeds: [
            'https://www.hachettebookgroup.com/feed/',
        ],
    },
    {
        publisher: 'Simon & Schuster',
        slug: 'simonschuster',
        feeds: [
            'https://www.simonandschuster.com/p/blog?format=rss',
        ],
    },
    {
        publisher: 'Macmillan Publishers',
        slug: 'macmillan',
        feeds: [
            'https://us.macmillan.com/rss/news',
        ],
    },
    {
        publisher: 'Tor Books',
        slug: 'tor',
        feeds: [
            'https://www.tor.com/feed/',
        ],
    },
    {
        publisher: 'BookPage',
        slug: 'bookpage',
        feeds: [
            'https://bookpage.com/feed',
        ],
    },
    {
        publisher: 'Publishers Weekly',
        slug: 'publishersweekly',
        feeds: [
            'https://www.publishersweekly.com/pw/feeds/home.xml',
        ],
    },
];

// ─── XML Parsing Utilities ───────────────────────────────────────────────────

/**
 * Extract text content of the first matching tag in XML string.
 */
function extractTag(xml: string, tag: string): string | null {
    // Try CDATA
    const cdataRe = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
    const cdataMatch = xml.match(cdataRe);
    if (cdataMatch) return cdataMatch[1].trim();

    // Try plain text
    const plainRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
    const plainMatch = xml.match(plainRe);
    if (plainMatch) return stripHtml(plainMatch[1].trim());

    return null;
}

/**
 * Extract attribute value from first matching tag.
 */
function extractAttr(xml: string, tag: string, attr: string): string | null {
    const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["'][^>]*>`, 'i');
    const match = xml.match(re);
    return match ? match[1] : null;
}

/**
 * Remove HTML tags from a string.
 */
function stripHtml(html: string): string {
    return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Attempt to find an image URL in an <item> XML block.
 * Checks: <media:content>, <media:thumbnail>, <enclosure>, og:image meta, first <img src>.
 */
function extractImage(itemXml: string): string | null {
    // <media:content url="..." .../>
    const mediaContent = itemXml.match(/<media:content[^>]*url=["']([^"']+)["'][^>]*>/i);
    if (mediaContent) return mediaContent[1];

    // <media:thumbnail url="..." .../>
    const mediaThumbnail = itemXml.match(/<media:thumbnail[^>]*url=["']([^"']+)["'][^>]*>/i);
    if (mediaThumbnail) return mediaThumbnail[1];

    // <enclosure url="..." type="image/..." />
    const enclosure = itemXml.match(/<enclosure[^>]*type=["']image[^"']*["'][^>]*url=["']([^"']+)["'][^>]*/i)
        || itemXml.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image[^"']*["'][^>]*/i);
    if (enclosure) return enclosure[1];

    // <img src="..." inside description/content
    const imgSrc = itemXml.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgSrc && !imgSrc[1].includes('pixel') && !imgSrc[1].includes('tracking')) {
        return imgSrc[1];
    }

    return null;
}

/**
 * Split raw XML feed into individual <item> blocks.
 */
function splitItems(xml: string): string[] {
    const items: string[] = [];
    const re = /<item[\s>]([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = re.exec(xml)) !== null) {
        items.push(match[1]);
    }
    // Also handle Atom <entry> elements
    if (items.length === 0) {
        const atomRe = /<entry[\s>]([\s\S]*?)<\/entry>/gi;
        while ((match = atomRe.exec(xml)) !== null) {
            items.push(match[1]);
        }
    }
    return items;
}

// ─── Parsed Article ──────────────────────────────────────────────────────────
interface ParsedArticle {
    publisher: string;
    publisher_slug: string;
    source_feed_url: string;
    title: string;
    summary: string | null;
    link: string;
    image_url: string | null;
    published_at: string | null;
}

/**
 * Fetch a single RSS/Atom feed and parse all items into ParsedArticle[].
 */
async function fetchAndParse(config: FeedConfig, feedUrl: string): Promise<ParsedArticle[]> {
    let xml: string;
    try {
        const res = await fetch(feedUrl, {
            headers: {
                'User-Agent': 'BookCAT/1.0 (book discovery app; RSS reader)',
                'Accept': 'application/rss+xml, application/atom+xml, text/xml, */*',
            },
            signal: AbortSignal.timeout(15_000),
        });

        if (!res.ok) {
            console.warn(`[${config.slug}] HTTP ${res.status} for ${feedUrl}`);
            return [];
        }
        xml = await res.text();
    } catch (err) {
        console.warn(`[${config.slug}] Fetch failed for ${feedUrl}:`, err);
        return [];
    }

    const items = splitItems(xml);
    const articles: ParsedArticle[] = [];

    for (const item of items) {
        // Link: try <link>, then <atom:link href="...">, then <guid>
        const link =
            extractTag(item, 'link') ||
            item.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] ||
            extractTag(item, 'guid');

        if (!link || !link.startsWith('http')) continue;

        const title = extractTag(item, 'title');
        if (!title) continue;

        const rawSummary =
            extractTag(item, 'description') ||
            extractTag(item, 'content:encoded') ||
            extractTag(item, 'summary') ||
            extractTag(item, 'content');

        const summary = rawSummary ? rawSummary.slice(0, 500) : null;
        const image_url = extractImage(item);

        // Date: try pubDate, published, updated, dc:date
        const rawDate =
            extractTag(item, 'pubDate') ||
            extractTag(item, 'published') ||
            extractTag(item, 'updated') ||
            extractTag(item, 'dc:date');

        let published_at: string | null = null;
        if (rawDate) {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) {
                published_at = d.toISOString();
            }
        }

        articles.push({
            publisher: config.publisher,
            publisher_slug: config.slug,
            source_feed_url: feedUrl,
            title,
            summary,
            link,
            image_url,
            published_at,
        });
    }

    console.log(`[${config.slug}] Parsed ${articles.length} items from ${feedUrl}`);
    return articles;
}

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
    // Allow both scheduled invocations (POST) and manual HTTP calls (GET)
    if (req.method !== 'GET' && req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
    });

    const stats = { total: 0, inserted: 0, skipped: 0, errors: 0 };

    for (const config of PUBLISHER_FEEDS) {
        for (const feedUrl of config.feeds) {
            const articles = await fetchAndParse(config, feedUrl);
            stats.total += articles.length;

            if (articles.length === 0) continue;

            // Upsert: on conflict (link) do nothing — prevents duplicates
            const { data, error } = await supabase
                .from('publisher_updates')
                .upsert(articles, {
                    onConflict: 'link',
                    ignoreDuplicates: true,
                })
                .select('id');

            if (error) {
                console.error(`[${config.slug}] DB error:`, error.message);
                stats.errors += articles.length;
            } else {
                const inserted = data?.length ?? 0;
                stats.inserted += inserted;
                stats.skipped += articles.length - inserted;
                console.log(`[${config.slug}] +${inserted} new, ${articles.length - inserted} already existed`);
            }
        }
    }

    // Purge articles older than 90 days to keep the table lean
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const { error: purgeError } = await supabase
        .from('publisher_updates')
        .delete()
        .lt('published_at', cutoff.toISOString());

    if (purgeError) {
        console.warn('Purge error:', purgeError.message);
    }

    const body = JSON.stringify({ ok: true, stats });
    return new Response(body, {
        headers: { 'Content-Type': 'application/json' },
    });
});
