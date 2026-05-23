import Groq from "groq-sdk";
import { GitHubData } from "../github/fetcher";
import { buildPrompt, PersonalityResult } from "../analyser/prompt";
import { AnalyserConfig } from "../types";

// ─── Constants ────────────────────────────────────────────────────────────────

const GROQ_MODEL = "llama-3.3-70b-versatile";

// ─── Helper: Strip Markdown Fences ───────────────────────────────────────────

function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

// ─── Helper: Validate Personality Result ─────────────────────────────────────

function validateResult(obj: any): obj is PersonalityResult {
  const requiredFields: (keyof PersonalityResult)[] = [
    "archetype",
    "archetypeEmoji",
    "summary",
    "workStyle",
    "communicationStyle",
    "strengths",
    "funFacts",
    "techIdentity",
    "collaborationStyle",
    "developerQuote",
    "roastLine",
  ];

  for (const field of requiredFields) {
    if (!(field in obj)) return false;
  }

  if (!Array.isArray(obj.strengths) || obj.strengths.length === 0) return false;
  if (!Array.isArray(obj.funFacts) || obj.funFacts.length === 0) return false;

  return true;
}

// ─── Helper: Parse Groq Response ─────────────────────────────────────────────

function parseGroqResponse(rawText: string): PersonalityResult {
  if (!rawText || rawText.trim() === "") {
    throw new Error("Groq returned an empty response.");
  }

  const cleaned = stripMarkdownFences(rawText);

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `Groq did not return valid JSON. Raw response: ${rawText.slice(0, 200)}`
    );
  }

  if (!validateResult(parsed)) {
    throw new Error("Groq response is missing required personality fields.");
  }

  return parsed as PersonalityResult;
}

// ─── Helper: Retry Logic ──────────────────────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 2,
  delayMs: number = 2000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (attempt <= retries) {
        await new Promise((res) => setTimeout(res, delayMs));
      }
    }
  }

  throw lastError;
}

// ─── Main Exported Function ───────────────────────────────────────────────────

export async function analysePersonality(
  githubData: GitHubData,
  config: AnalyserConfig
): Promise<PersonalityResult> {
  // Groq client is now created with the user-provided key
  const groq = new Groq({ apiKey: config.groqApiKey });
  const prompt = buildPrompt(githubData);

  return await withRetry(async () => {
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.85,
      max_tokens: 1500,
      messages: [
        {
          role: "system",
          content:
            "You are a witty developer personality analyser. You always respond with valid raw JSON only. No markdown, no backticks, no explanation — just the JSON object.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const rawText = response.choices[0]?.message?.content ?? "";
    return parseGroqResponse(rawText);
  });
}