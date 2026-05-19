const GEMINI_API_KEY = "your_gemini_api_key_here";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

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
