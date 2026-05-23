// ─── Library Config ───────────────────────────────────────────────────────────
// This is what the user passes when using the library

export interface AnalyserConfig {
  githubToken: string;   // GitHub Personal Access Token
  groqApiKey: string;    // Groq API Key
}

// ─── Re-export all types users might need ────────────────────────────────────

export type {
  GitHubData,
  UserProfile,
  Repository,
  CommitInfo,
  ActivitySummary,
} from "./github/fetcher";

export type { PersonalityResult } from "./analyser/prompt";