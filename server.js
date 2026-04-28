import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.join(__dirname, ".env"),
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

console.log("--------------------------------");
console.log("ENV path:", path.join(__dirname, ".env"));
console.log("Gemini key found:", GEMINI_API_KEY ? "YES ✅" : "NO ❌");
console.log("Node version:", process.version);
console.log("--------------------------------");

let cachedModel = null;

/* HEALTH CHECK */
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "SPY AI backend is running",
    geminiConnected: GEMINI_API_KEY.trim() !== "",
    selectedModel: cachedModel || "not selected yet",
  });
});

/* SHOW AVAILABLE MODELS */
app.get("/api/models", async (req, res) => {
  try {
    const models = await listGeminiModels();

    res.json({
      success: true,
      models,
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
    });
  }
});

/* TEST GEMINI */
app.get("/api/test-gemini", async (req, res) => {
  try {
    const reply = await askGemini("Say hello in English.");
    res.json({
      success: true,
      model: cachedModel,
      reply,
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
    });
  }
});

/* CHAT API */
app.post("/api/chat", async (req, res) => {
  const { message } = req.body;

  if (!message || message.trim() === "") {
    return res.json({
      success: false,
      reply: "No message received.",
    });
  }

  if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === "") {
    return res.json({
      success: true,
      reply:
        "Gemini API key is missing. Add GEMINI_API_KEY in .env file and restart the server.",
    });
  }

  try {
    const reply = await askGemini(message);

    return res.json({
      success: true,
      model: cachedModel,
      reply,
    });
  } catch (error) {
    console.error("❌ Gemini final error:");
    console.error(error.message);

    return res.json({
      success: true,
      reply: `Gemini error: ${error.message}`,
    });
  }
});

/* LIST MODELS FROM GOOGLE */
async function listGeminiModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(
    GEMINI_API_KEY.trim()
  )}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || JSON.stringify(data));
  }

  return data.models || [];
}

/* PICK A MODEL THAT SUPPORTS generateContent */
async function getWorkingModel() {
  if (cachedModel) return cachedModel;

  const models = await listGeminiModels();

  const generateModels = models.filter((model) => {
    return model.supportedGenerationMethods?.includes("generateContent");
  });

  if (generateModels.length === 0) {
    throw new Error("No Gemini model found that supports generateContent.");
  }

  const preferredOrder = [
    "models/gemini-2.5-flash",
    "models/gemini-2.5-flash-lite",
    "models/gemini-2.0-flash",
    "models/gemini-2.0-flash-lite",
  ];

  for (const preferred of preferredOrder) {
    const found = generateModels.find((model) => model.name === preferred);

    if (found) {
      cachedModel = found.name;
      console.log("✅ Selected Gemini model:", cachedModel);
      return cachedModel;
    }
  }

  cachedModel = generateModels[0].name;
  console.log("✅ Selected Gemini model:", cachedModel);
  return cachedModel;
}

/* ASK GEMINI */
async function askGemini(userMessage) {
  const model = await getWorkingModel();

  const prompt = `
You are SPY AI, a helpful multilingual assistant.

Rules:
- Reply in the same language as the user.
- If the user asks in Kannada, reply in Kannada.
- If the user asks in Hindi, reply in Hindi.
- If the user asks in English, reply in English.
- Answer global/general knowledge questions clearly.
- Keep answers beginner-friendly.
- Do not say backend failed.
- Do not say you are a beginner AI.

User asked:
${userMessage}
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${encodeURIComponent(
    GEMINI_API_KEY.trim()
  )}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || JSON.stringify(data));
  }

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("") || "";

  if (!text.trim()) {
    throw new Error("Gemini returned an empty response.");
  }

  return text.trim();
}

/* FRONTEND FALLBACK */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* START SERVER */
app.listen(PORT, () => {
  console.log("SPY AI backend is running");
  console.log(`Open: http://localhost:${PORT}`);
});