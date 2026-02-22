// supabase/functions/generate-book-fact/index.ts
// Deno / Supabase Edge Function
// Generates up to 2 "Book Fact of the Day" entries per day using Groq (LLaMA).
// Called from the Dashboard or via cron.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = 'llama-3.3-70b-versatile';
const MAX_FACTS_PER_DAY = 2;

const CATEGORIES = [
    'history', 'author', 'publishing', 'adaptation',
    'record', 'trivia', 'origin', 'influence',
] as const;

const CATEGORY_EMOJI: Record<string, string> = {
    history:     '📜',
    author:      '✍️',
    publishing:  '📖',
    adaptation:  '🎬',
    record:      '🏆',
    trivia:      '💡',
    origin:      '🌱',
    influence:   '🌍',
};

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookFact {
    fact_text: string;
    book_title: string;
    book_author: string;
    category: string;
}

async function generateFact(groqKey: string, existingFacts: string[] = []): Promise<BookFact> {
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

    // Build an avoidance clause so we never repeat
    const avoidClause = existingFacts.length > 0
        ? `\n\nIMPORTANT: Do NOT repeat or rephrase any of these facts that were already generated today:\n${existingFacts.map((f, i) => `${i + 1}. "${f}"`).join('\n')}\nGenerate a completely DIFFERENT fact about a DIFFERENT book/topic.`
        : '';

    const prompt = `You are a book trivia expert. Generate ONE fascinating, little-known fact about books or literature.

Category: ${category}
(history = historical book facts, author = interesting author stories, publishing = publishing industry facts, adaptation = book-to-film/TV facts, record = world records about books, trivia = surprising book trivia, origin = origin stories of famous books, influence = how books influenced the real world)${avoidClause}

Respond ONLY with a valid JSON object:
{
  "fact_text": "<the fact, 1-2 sentences, max 250 chars, engaging and surprising>",
  "book_title": "<the book this fact is about, or 'General' if not book-specific>",
  "book_author": "<the author, or empty string if general>",
  "category": "${category}"
}

Rules:
- The fact must be TRUE and verifiable
- Keep it concise and interesting — the kind of fact that makes someone say "wow!"
- No markdown, no extra keys, pure JSON only`;

    const res = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
                { role: 'system', content: 'You are a book trivia expert. Respond ONLY with valid JSON.' },
                { role: 'user', content: prompt },
            ],
            temperature: 1.0,
            max_tokens: 300,
            response_format: { type: 'json_object' },
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Groq error ${res.status}: ${err}`);
    }

    const json = await res.json();
    const raw = json.choices?.[0]?.message?.content?.trim();
    if (!raw) throw new Error('Empty Groq response');

    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(cleaned) as BookFact;

    if (!parsed.fact_text || typeof parsed.fact_text !== 'string') {
        throw new Error(`Invalid fact shape: ${JSON.stringify(parsed)}`);
    }

    // Normalize category
    if (!CATEGORIES.includes(parsed.category as typeof CATEGORIES[number])) {
        parsed.category = category;
    }

    return parsed;
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: CORS_HEADERS });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const groqKey     = Deno.env.get('GROQ_API_KEY');

    if (!groqKey) {
        return new Response(
            JSON.stringify({ ok: false, error: 'GROQ_API_KEY not set' }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
        );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
    });

    const todayUTC = new Date().toISOString().split('T')[0];

    // ── Check how many facts already exist for today ─────────────────────────
    const { data: existingFacts, error: fetchErr } = await supabase
        .from('daily_book_facts')
        .select('id, fact_text')
        .eq('fact_date', todayUTC);

    if (fetchErr) {
        return new Response(
            JSON.stringify({ ok: false, error: fetchErr.message }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
        );
    }

    const currentCount = existingFacts?.length || 0;

    if (currentCount >= MAX_FACTS_PER_DAY) {
        // Already at limit — return existing facts
        return new Response(
            JSON.stringify({
                ok: true,
                skipped: true,
                message: `Already have ${MAX_FACTS_PER_DAY} facts for today`,
                facts: existingFacts,
            }),
            { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
        );
    }

    // ── Generate a new fact ──────────────────────────────────────────────────
    const existingTexts = (existingFacts || []).map((f: { fact_text: string }) => f.fact_text);
    let fact: BookFact;
    try {
        fact = await generateFact(groqKey, existingTexts);
    } catch (err) {
        console.error('Fact generation failed:', err);
        return new Response(
            JSON.stringify({ ok: false, error: String(err) }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
        );
    }

    const emoji = CATEGORY_EMOJI[fact.category] || '📚';

    const { data: inserted, error: insertErr } = await supabase
        .from('daily_book_facts')
        .insert({
            fact_date:   todayUTC,
            fact_text:   fact.fact_text,
            book_title:  fact.book_title || null,
            book_author: fact.book_author || null,
            category:    fact.category,
            emoji,
        })
        .select()
        .single();

    if (insertErr) {
        console.error('DB insert error:', insertErr);
        return new Response(
            JSON.stringify({ ok: false, error: insertErr.message }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
        );
    }

    console.log(`✅ Book fact created for ${todayUTC}:`, inserted.id);

    return new Response(
        JSON.stringify({
            ok: true,
            fact_date: todayUTC,
            fact: inserted,
            total_today: currentCount + 1,
        }),
        { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    );
});
