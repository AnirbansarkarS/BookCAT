// supabase/functions/generate-hot-takes/index.ts
// Deno / Supabase Edge Function
// Generates 4 daily "Hot Takes" about books, reading, and the industry using Groq (LLaMA).
// Called via cron or manually from the Discover page.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = 'llama-3.3-70b-versatile';
const MAX_TAKES_PER_DAY = 4;

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HotTake {
    take_text: string;
    topic: string;
    category: string;
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: CORS_HEADERS });
    }

    try {
        // Use service_role client for admin tasks
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Create a client with the user's auth token to verify the user
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
                status: 401,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            });
        }
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            });
        }

        // Check if takes have already been generated today
        const todayUTC = new Date().toISOString().split('T')[0];
        const { data: existingTakes, error: fetchError } = await supabaseAdmin
            .from('daily_hot_takes')
            .select('take_text')
            .eq('take_date', todayUTC);

        if (fetchError) throw fetchError;

        if (existingTakes.length >= MAX_TAKES_PER_DAY) {
            return new Response(JSON.stringify({ message: 'Hot takes already generated for today.' }), {
                status: 200,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            });
        }

        // Generate new takes
        const groqKey = Deno.env.get('GROQ_API_KEY');
        if (!groqKey) throw new Error('GROQ_API_KEY is not set.');

        const existingTakeTexts = existingTakes.map(t => t.take_text);
        const newTakes = await generateHotTakes(groqKey, existingTakeTexts);

        if (newTakes.length === 0) {
            return new Response(JSON.stringify({ message: 'No new takes were generated.' }), {
                status: 200,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            });
        }

        // Save new takes to the database
        const takesToInsert = newTakes.map(take => ({
            ...take,
            take_date: todayUTC,
        }));

        const { error: insertError } = await supabaseAdmin
            .from('daily_hot_takes')
            .insert(takesToInsert);

        if (insertError) throw insertError;

        return new Response(JSON.stringify({ success: true, generated: newTakes.length }), {
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
    }
});

async function generateHotTakes(groqKey: string, existingTakes: string[] = []): Promise<HotTake[]> {
    const avoidClause = existingTakes.length > 0
        ? `\n\nDo NOT repeat these existing takes:\n${existingTakes.map((t, i) => `${i + 1}. "${t}"`).join('\n')}`
        : '';

    const prompt = `You are a provocative book culture commentator. Generate exactly 4 hot takes — bold, opinionated statements about books, reading culture, pricing, publishers, audiobooks, e-readers, or literary discussions that readers would love to debate.

Categories to pick from: reading_habits, book_industry, pricing, technology, culture, debates${avoidClause}

Respond ONLY with a valid JSON object:
{
  "takes": [
    {
      "take_text": "<bold opinion, 1-2 sentences, max 200 chars, provocative but not offensive>",
      "topic": "<short topic label, e.g. 'e-readers', 'audiobooks', 'book prices'>",
      "category": "<one of: reading_habits, book_industry, pricing, technology, culture, debates>"
    }
  ]
}

Rules:
- Each take should be a STRONG OPINION that splits readers into agree/disagree camps
- Keep them about books, reading, publishing, literary culture
- Be specific and timely — reference real trends, technologies, or debates
- Vary the categories across the 4 takes
- No hate speech, no author bashing, keep it fun and thought-provoking
- Pure JSON only, no markdown`;

    const res = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
                { role: 'system', content: 'You are a provocative book culture commentator. Respond ONLY with valid JSON.' },
                { role: 'user', content: prompt },
            ],
            temperature: 1.0,
            max_tokens: 800,
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
    const parsed = JSON.parse(cleaned);

    const takes: HotTake[] = (parsed.takes || []).slice(0, MAX_TAKES_PER_DAY);

    // Validate
    const validCategories = ['reading_habits', 'book_industry', 'pricing', 'technology', 'culture', 'debates'];
    for (const take of takes) {
        if (!take.take_text || typeof take.take_text !== 'string') {
            throw new Error(`Invalid take shape: ${JSON.stringify(take)}`);
        }
        if (!validCategories.includes(take.category)) {
            take.category = 'debates';
        }
        if (!take.topic) take.topic = 'general';
    }

    return takes;
}
