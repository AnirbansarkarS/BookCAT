// src/services/moodSearchService.js
// ─── Mood-based book discovery using Gemini + Google Books API ───

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GOOGLE_BOOKS_API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY; // optional

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// ═══════════════════════════════════════════════════════════
// Step 1 — Convert user mood / intent → Google Books query
// ═══════════════════════════════════════════════════════════

/**
 * Uses Gemini to analyse freeform user input (mood, vibe, request)
 * and returns an optimised Google Books API search query string.
 *
 * @param {string} userInput e.g. "I want a simple comforting short story"
 * @returns {Promise<string>} e.g. "subject:short stories comforting fiction"
 */
export async function transformUserIntentToGoogleQuery(userInput) {
  if (!GEMINI_API_KEY) {
    console.warn('VITE_GEMINI_API_KEY not set – falling back to raw input');
    return userInput;
  }

  const systemPrompt = `You are a book recommendation search engine expert who ONLY recommends well-known, popular, bestselling books.

Given a user's natural-language reading request, extract:
- genre (e.g. fiction, mystery, romance, sci-fi, non-fiction)
- tone (e.g. comforting, thrilling, dark, lighthearted, inspiring)
- length preference (e.g. short stories, novellas, long epic)
- complexity (e.g. easy, moderate, literary, dense)
- any specific subjects, themes, or keywords

Then construct an optimised Google Books API search query.

CRITICAL RULES:
- ALWAYS include names of 2-3 famous bestselling authors or bestselling book titles that match the mood.
- Think of NYT bestsellers, award winners, and widely-read popular books.
- DO NOT create generic searches that return obscure or unknown books.
- Use Google Books query operators: subject:<genre>, intitle:<title>, inauthor:<author>

Return ONLY the final query string — no explanation, no markdown, no quotes.

Examples:
  User: "I want a simple comforting short story"
  Query: subject:fiction comforting short stories inauthor:alice munro OR inauthor:jhumpa lahiri bestseller

  User: "dark psychological thriller like Gone Girl"
  Query: subject:thriller psychological suspense inauthor:gillian flynn OR inauthor:paula hawkins OR intitle:girl on the train

  User: "non-fiction about space for beginners"
  Query: subject:science space cosmos inauthor:carl sagan OR inauthor:neil degrasse tyson popular

  User: "something cozy and comforting"
  Query: subject:fiction cozy comforting feel-good inauthor:matt haig OR intitle:midnight library OR inauthor:fredrik backman bestseller`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser: "${userInput}"\nQuery:` }] },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 120,
        },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('Gemini query transform error:', errBody);
      return userInput; // fallback
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || userInput;
  } catch (err) {
    console.error('Gemini query transform failed:', err);
    return userInput;
  }
}

// ═══════════════════════════════════════════════════════════
// Step 2 — Call Google Books API
// ═══════════════════════════════════════════════════════════

/**
 * Searches Google Books with the given query string.
 *
 * @param {string} query   optimised search string
 * @param {number} maxResults  number of results (default 10)
 * @returns {Promise<Array>} normalised book objects
 */
export async function searchGoogleBooks(query, maxResults = 10) {
  // Fetch more results than needed so we can filter for popular ones
  const fetchCount = Math.min(maxResults * 4, 40);
  const encoded = encodeURIComponent(query);
  const keyParam = GOOGLE_BOOKS_API_KEY ? `&key=${GOOGLE_BOOKS_API_KEY}` : '';
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encoded}&maxResults=${fetchCount}&printType=books&orderBy=relevance&langRestrict=en${keyParam}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Google Books API ${res.status}`);

    const data = await res.json();

    const allBooks = (data.items || []).map((item) => {
      const v = item.volumeInfo;
      const isbn = v.industryIdentifiers?.find(
        (id) => id.type === 'ISBN_13' || id.type === 'ISBN_10',
      );
      return {
        id: item.id,
        title: v.title || 'Untitled',
        authors: v.authors?.join(', ') || 'Unknown',
        description: v.description || '',
        thumbnail:
          v.imageLinks?.thumbnail?.replace('http:', 'https:') ||
          v.imageLinks?.smallThumbnail?.replace('http:', 'https:') ||
          null,
        isbn: isbn?.identifier || null,
        publishedDate: v.publishedDate || null,
        pageCount: v.pageCount || null,
        categories: v.categories || [],
        averageRating: v.averageRating || null,
        ratingsCount: v.ratingsCount || 0,
        previewLink: v.previewLink || null,
        infoLink: v.infoLink || null,
      };
    });

    // Sort by popularity (ratingsCount) to surface famous books first
    allBooks.sort((a, b) => (b.ratingsCount || 0) - (a.ratingsCount || 0));

    // Return the top N most popular
    return allBooks.slice(0, maxResults);
  } catch (err) {
    console.error('Google Books search failed:', err);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════
// Step 3 — AI re-rank by emotional relevance (optional)
// ═══════════════════════════════════════════════════════════

/**
 * Uses Gemini to re-rank a list of books by how well they match
 * the user's emotional / thematic intent.  Returns the top N.
 *
 * @param {string} userInput  original mood string
 * @param {Array}  books      results from Google Books
 * @param {number} topN       how many to return (default 5)
 * @returns {Promise<Array>}  re-ranked subset with `aiReason`
 */
export async function rankBooksByRelevance(userInput, books, topN = 5) {
  if (!GEMINI_API_KEY || books.length === 0) return books.slice(0, topN);

  const bookList = books
    .map(
      (b, i) =>
        `${i + 1}. "${b.title}" by ${b.authors} — ${(b.description || '').slice(0, 150)}`,
    )
    .join('\n');

  const prompt = `You are a book recommendation expert who prioritises famous, bestselling, and widely-loved books.

The user said: "${userInput}"

Here are ${books.length} book results:
${bookList}

Re-rank these books by:
1. How well they match the user's emotional and thematic intent
2. How famous, popular, and well-reviewed the book is (prefer bestsellers, award winners, and widely-known titles)
3. Skip any obscure, self-published, or unknown titles — only include books most readers would recognise

Return ONLY a JSON array of objects with the format:
[
  { "index": <1-based original index>, "reason": "<one short sentence why this book fits>" }
]
Return the top ${topN} books only. No markdown fences, no explanation — just the JSON array.`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 600,
        },
      }),
    });

    if (!res.ok) {
      console.error('Gemini ranking error:', await res.text());
      return books.slice(0, topN);
    }

    const data = await res.json();
    let raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    // Strip markdown code fences if present
    raw = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

    const ranked = JSON.parse(raw);

    return ranked
      .map((r) => {
        const book = books[r.index - 1];
        if (!book) return null;
        return { ...book, aiReason: r.reason };
      })
      .filter(Boolean);
  } catch (err) {
    console.error('Gemini ranking failed:', err);
    return books.slice(0, topN);
  }
}

// ═══════════════════════════════════════════════════════════
// Mood classifier helper
// ═══════════════════════════════════════════════════════════

/**
 * Classifies user mood input into structured metadata.
 *
 * @param {string} userInput
 * @returns {Promise<{
 *   genre: string,
 *   tone: string,
 *   pace: string,
 *   complexity: string,
 *   themes: string[]
 * } | null>}
 */
export async function classifyMoodInput(userInput) {
  if (!GEMINI_API_KEY) return null;

  const prompt = `You are a literary mood classifier. Given a user's reading request, extract structured dimensions.

Return ONLY a valid JSON object with exactly these fields:
{
  "genre": "<primary genre: fiction|mystery|thriller|romance|sci-fi|fantasy|horror|non-fiction|historical|self-help|biography>",
  "tone": "<emotional tone: cozy|dark|uplifting|melancholic|thrilling|funny|inspiring|tense|whimsical|serious>",
  "pace": "<reading pace: slow|medium|fast>",
  "complexity": "<reading complexity: light|moderate|dense>",
  "themes": ["<theme1>", "<theme2>"]
}

No markdown, no explanation. Just the JSON object.

Input: "${userInput}"
Output:`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 150,
        },
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();

    let raw =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    raw = raw
      .replace(/```json\s*/gi, '')
      .replace(/```/g, '')
      .trim();

    return JSON.parse(raw);
  } catch (err) {
    console.error('Mood classification failed:', err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// Full pipeline helper
// ═══════════════════════════════════════════════════════════

/**
 * End-to-end mood search:
 * intent → query → Google Books → AI ranking
 *
 * @param {string} userInput
 * @param {{ maxResults?: number, topN?: number }} opts
 * @returns {Promise<{
 *   query: string,
 *   allResults: Array,
 *   ranked: Array
 * }>}
 */
export async function moodSearch(userInput, { maxResults = 10, topN = 5 } = {}) {
  // Pass 0 + Pass 1 run in parallel — classifier enriches the prompt context
  const [moodProfile, query] = await Promise.all([
    classifyMoodInput(userInput),
    transformUserIntentToGoogleQuery(userInput),
  ]);

  // Step 2 – Google Books API
  const allResults = await searchGoogleBooks(query, maxResults);

  // Step 3 – AI re-ranking
  const ranked = await rankBooksByRelevance(userInput, allResults, topN);

  return { query, moodProfile, allResults, ranked };
}

// ═══════════════════════════════════════════════════════════
// Book Chatbot — conversational book knowledge assistant
// ═══════════════════════════════════════════════════════════

/**
 * Sends a message to the book chatbot and returns a response.
 * @param {Array<{role: 'user'|'model', text: string}>} history
 * @param {string} newMessage
 * @returns {Promise<string>}
 */
export async function chatWithBookBot(history, newMessage) {
  if (!GEMINI_API_KEY) return "Gemini API key not set.";

  const systemContext = `You are BookBot, an expert literary assistant for the BookCat app. You have deep knowledge of:
- Books across all genres (fiction, non-fiction, mystery, sci-fi, fantasy, romance, horror, etc.)
- Authors, their writing styles, and bibliographies
- Plot summaries, themes, and literary analysis
- Book recommendations based on mood, preferences, and reading history
- Publishing history, awards (Booker, Pulitzer, Hugo, Nebula, etc.)
- Reading tips, book clubs, and literary culture

Personality: warm, enthusiastic about books, concise but insightful. Never make up books that don't exist.
If asked for recommendations, always suggest real, well-known titles with author names.
Keep responses under 200 words unless a detailed analysis is requested.`;

  const contents = [
    { role: 'user', parts: [{ text: systemContext + '\n\nLet\'s chat about books!' }] },
    { role: 'model', parts: [{ text: "Hi! I'm BookBot 📚 Your literary companion on BookCat. Ask me anything — recommendations, author info, plot questions, or just what to read next!" }] },
    ...history.map(m => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
    { role: 'user', parts: [{ text: newMessage }] },
  ];

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
      }),
    });
    if (!res.ok) return "Sorry, I couldn't connect right now. Try again!";
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Hmm, no response. Try again!";
  } catch (err) {
    console.error('BookBot error:', err);
    return "Something went wrong. Please try again!";
  }
}