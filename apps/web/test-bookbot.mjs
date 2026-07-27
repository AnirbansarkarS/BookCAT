const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY environment variable is not set");
  process.exit(1);
}

const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    contents: [{ role: "user", parts: [{ text: "Recommend a book like Dune" }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
  }),
});

const data = await res.json();
console.log("Status:", res.status);
console.log("Full response:", JSON.stringify(data, null, 2));
