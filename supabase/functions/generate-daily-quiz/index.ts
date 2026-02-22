// supabase/functions/generate-daily-quiz/index.ts
// Deno / Supabase Edge Function
// Generates one AI quiz question per day using Groq (LLaMA) and stores
// it in the daily_quiz table.  Runs at midnight UTC via pg_cron.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Curated pool of well-known books ───────────────────────────────────────
// Add more entries to diversify quiz variety.
const BOOK_POOL = [
    { title: 'To Kill a Mockingbird',      author: 'Harper Lee',          genre: 'Fiction',       era: '1960s' },
    { title: '1984',                        author: 'George Orwell',       genre: 'Dystopian',     era: '1940s' },
    { title: 'Pride and Prejudice',         author: 'Jane Austen',         genre: 'Romance',       era: '1800s' },
    { title: 'The Great Gatsby',            author: 'F. Scott Fitzgerald', genre: 'Fiction',       era: '1920s' },
    { title: 'Harry Potter and the Sorcerer\'s Stone', author: 'J.K. Rowling', genre: 'Fantasy', era: '1990s' },
    { title: 'The Hitchhiker\'s Guide to the Galaxy',  author: 'Douglas Adams', genre: 'Sci-Fi',  era: '1970s' },
    { title: 'Dune',                        author: 'Frank Herbert',       genre: 'Sci-Fi',        era: '1960s' },
    { title: 'The Catcher in the Rye',      author: 'J.D. Salinger',       genre: 'Fiction',       era: '1950s' },
    { title: 'Brave New World',             author: 'Aldous Huxley',       genre: 'Dystopian',     era: '1930s' },
    { title: 'The Lord of the Rings',       author: 'J.R.R. Tolkien',      genre: 'Fantasy',       era: '1950s' },
    { title: 'Crime and Punishment',        author: 'Fyodor Dostoevsky',   genre: 'Literary',      era: '1860s' },
    { title: 'One Hundred Years of Solitude', author: 'Gabriel García Márquez', genre: 'Magical Realism', era: '1960s' },
    { title: 'The Alchemist',              author: 'Paulo Coelho',        genre: 'Fiction',       era: '1980s' },
    { title: 'Sapiens',                    author: 'Yuval Noah Harari',   genre: 'Non-Fiction',   era: '2010s' },
    { title: 'Atomic Habits',             author: 'James Clear',         genre: 'Self-Help',     era: '2010s' },
    { title: 'The Midnight Library',       author: 'Matt Haig',           genre: 'Fiction',       era: '2020s' },
    { title: 'Project Hail Mary',          author: 'Andy Weir',           genre: 'Sci-Fi',        era: '2020s' },
    { title: 'Fourth Wing',               author: 'Rebecca Yarros',      genre: 'Fantasy',       era: '2020s' },
    { title: 'The Name of the Wind',       author: 'Patrick Rothfuss',    genre: 'Fantasy',       era: '2000s' },
    { title: 'Educated',                  author: 'Tara Westover',       genre: 'Memoir',        era: '2010s' },
    { title: 'Gone Girl',                 author: 'Gillian Flynn',       genre: 'Thriller',      era: '2010s' },
    { title: 'The Hunger Games',          author: 'Suzanne Collins',     genre: 'Dystopian',     era: '2000s' },
    { title: 'Little Fires Everywhere',   author: 'Celeste Ng',          genre: 'Fiction',       era: '2010s' },
    { title: 'Where the Crawdads Sing',   author: 'Delia Owens',        genre: 'Mystery',       era: '2010s' },
    { title: 'The Seven Husbands of Evelyn Hugo', author: 'Taylor Jenkins Reid', genre: 'Fiction', era: '2010s' },
    { title: 'Circe',                     author: 'Madeline Miller',     genre: 'Fantasy',       era: '2010s' },
    { title: 'The Road',                  author: 'Cormac McCarthy',     genre: 'Post-Apocalyptic', era: '2000s' },
    { title: 'Normal People',             author: 'Sally Rooney',        genre: 'Romance',       era: '2010s' },
    { title: 'The Kite Runner',           author: 'Khaled Hosseini',     genre: 'Fiction',       era: '2000s' },
    { title: 'Frankenstein',              author: 'Mary Shelley',        genre: 'Gothic Horror', era: '1810s' },
];

const QUESTION_TYPES = ['quote', 'author', 'genre', 'era', 'plot', 'trivia'] as const;
type QuestionType = typeof QUESTION_TYPES[number];

// ─── Groq API call ──────────────────────────────────────────────────────────

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

interface QuizQuestion {
    question_type: QuestionType;
    question: string;
    options: string[];        // exactly 4
    correct_answer: number;   // 0-based index
    explanation: string;
}

async function generateQuizQuestion(
    book: typeof BOOK_POOL[number],
    questionType: QuestionType,
    groqKey: string,
): Promise<QuizQuestion | null> {
    const typePromptMap: Record<QuestionType, string> = {
        quote:  `Create a "Guess the book from this quote" question. Include a real or plausible famous quote FROM the book "${book.title}" by ${book.author} in the question. The 4 options should be book titles.`,
        author: `Create a "Who wrote this book?" question about the book "${book.title}". Show the book title + a one-sentence plot hint and ask who wrote it. The 4 options should be author names (include the real author ${book.author}).`,
        genre:  `Create a "What genre is this book?" question about "${book.title}" by ${book.author}. Give a brief plot description and ask the reader to identify the genre. The 4 options should be genre names.`,
        era:    `Create a "Which decade was this book published in?" question about "${book.title}" by ${book.author}. The 4 options should be different decades/eras (e.g. "1960s", "1980s").`,
        plot:   `Create a "Which plot best describes this book?" question about "${book.title}" by ${book.author}. Give 4 brief plot summaries — one correct, three plausible fakes.`,
        trivia: `Create a fun literary trivia question about "${book.title}" by ${book.author} (e.g. about its writing, publication, awards, adaptations, or the author's life). 4 options.`,
    };

    const prompt = `You are a literary quiz master. Generate exactly ONE multiple choice quiz question.

Task: ${typePromptMap[questionType]}

Respond ONLY with a valid JSON object matching this exact schema:
{
  "question": "<question text, max 200 chars>",
  "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
  "correct_answer": <0-based index of correct option, integer 0-3>,
  "explanation": "<1-2 sentences explaining the answer, interesting and educational>"
}

Rules:
- options must be exactly 4 strings
- correct_answer must be an integer between 0 and 3
- Keep each option under 80 characters
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
                { role: 'system', content: 'You are a literary quiz master. Respond ONLY with valid JSON, no markdown fences.' },
                { role: 'user', content: prompt },
            ],
            temperature: 0.9,
            max_tokens: 512,
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

    // Strip markdown fences just in case
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(cleaned) as Omit<QuizQuestion, 'question_type'>;

    // Validate shape
    if (
        typeof parsed.question !== 'string' ||
        !Array.isArray(parsed.options) || parsed.options.length !== 4 ||
        typeof parsed.correct_answer !== 'number' ||
        parsed.correct_answer < 0 || parsed.correct_answer > 3
    ) {
        throw new Error(`Invalid quiz shape: ${JSON.stringify(parsed)}`);
    }

    return { ...parsed, question_type: questionType };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: CORS_HEADERS });
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    const supabaseUrl     = Deno.env.get('SUPABASE_URL')!;
    const serviceKey      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const groqKey         = Deno.env.get('GROQ_API_KEY');

    if (!groqKey) {
        return new Response(
            JSON.stringify({ ok: false, error: 'GROQ_API_KEY not set' }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
        );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
    });

    // ── 1. Check if today's quiz already exists ──────────────────────────────
    const todayUTC = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

    const { data: existing } = await supabase
        .from('daily_quiz')
        .select('id, quiz_date')
        .eq('quiz_date', todayUTC)
        .maybeSingle();

    if (existing) {
        console.log(`Quiz for ${todayUTC} already exists (${existing.id}), skipping.`);
        return new Response(
            JSON.stringify({ ok: true, skipped: true, quiz_date: todayUTC, quiz_id: existing.id }),
            { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
        );
    }

    // ── 2. Pick a random book — avoid recent repeats ─────────────────────────
    // Fetch the last 7 book titles used to avoid repeating
    const { data: recentRows } = await supabase
        .from('daily_quiz')
        .select('book_title')
        .order('quiz_date', { ascending: false })
        .limit(7);

    const recentTitles = new Set((recentRows || []).map((r: { book_title: string }) => r.book_title));
    const eligible = BOOK_POOL.filter(b => !recentTitles.has(b.title));
    const pool = eligible.length > 0 ? eligible : BOOK_POOL;
    const book = pool[Math.floor(Math.random() * pool.length)];

    // ── 3. Pick a random question type ───────────────────────────────────────
    const questionType: QuestionType = QUESTION_TYPES[
        Math.floor(Math.random() * QUESTION_TYPES.length)
    ];

    console.log(`Generating ${questionType} quiz for "${book.title}" (${todayUTC})`);

    // ── 4. Generate quiz via Groq ─────────────────────────────────────────────
    let quiz: QuizQuestion | null = null;
    try {
        quiz = await generateQuizQuestion(book, questionType, groqKey);
    } catch (err) {
        console.error('Quiz generation failed:', err);
        return new Response(
            JSON.stringify({ ok: false, error: String(err) }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
        );
    }

    if (!quiz) {
        return new Response(
            JSON.stringify({ ok: false, error: 'Failed to generate quiz' }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
        );
    }

    // ── 5. Store in database ─────────────────────────────────────────────────
    const row = {
        quiz_date:      todayUTC,
        book_title:     book.title,
        book_author:    book.author,
        cover_url:      null, // can be enriched later via Google Books API
        question_type:  quiz.question_type,
        question:       quiz.question,
        options:        quiz.options,
        correct_answer: quiz.correct_answer,
        explanation:    quiz.explanation,
    };

    const { data: inserted, error: insertError } = await supabase
        .from('daily_quiz')
        .insert(row)
        .select('id')
        .single();

    if (insertError) {
        console.error('DB insert error:', insertError);
        return new Response(
            JSON.stringify({ ok: false, error: insertError.message }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
        );
    }

    console.log(`✅ Quiz created for ${todayUTC}:`, inserted.id);

    return new Response(
        JSON.stringify({
            ok: true,
            quiz_date: todayUTC,
            quiz_id:  inserted.id,
            book:     book.title,
            type:     questionType,
        }),
        { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    );
});
