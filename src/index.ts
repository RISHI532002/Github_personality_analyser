import { fetchGitHubData } from "./github/fetcher";
import { analysePersonality } from "./ai/groq";
import { AnalyserConfig, PersonalityResult } from "./types";
import { GitHubData } from "./github/fetcher";

// ─── Re-export everything users might need ────────────────────────────────────

export type { AnalyserConfig, PersonalityResult, GitHubData };
export type {
  UserProfile,
  Repository,
  CommitInfo,
  ActivitySummary,
} from "./github/fetcher";

// ─── Main Function — Full Pipeline ───────────────────────────────────────────
// Fetches GitHub data + analyses personality in one call

export async function analyseGitHubPersonality(
  username: string,
  config: AnalyserConfig
): Promise<PersonalityResult> {
  validateConfig(config);
  validateUsername(username);

  const githubData = await fetchGitHubData(username, config);
  const personality = await analysePersonality(githubData, config);

  return personality;
}

// ─── Individual Functions — For Advanced Use ──────────────────────────────────
// Users can call these separately if they want more control

export async function getGitHubData(
  username: string,
  config: AnalyserConfig
): Promise<GitHubData> {
  validateConfig(config);
  validateUsername(username);

  return await fetchGitHubData(username, config);
}

export async function getPersonalityFromData(
  githubData: GitHubData,
  config: AnalyserConfig
): Promise<PersonalityResult> {
  validateConfig(config);

  return await analysePersonality(githubData, config);
}

// ─── Validators ───────────────────────────────────────────────────────────────

function validateConfig(config: AnalyserConfig): void {
  if (!config) {
    throw new Error(
      "[github-personality-analyser] config is required. Pass { githubToken, groqApiKey }."
    );
  }
  if (!config.githubToken || config.githubToken.trim() === "") {
    throw new Error(
      "[github-personality-analyser] config.githubToken is missing or empty."
    );
  }
  if (!config.groqApiKey || config.groqApiKey.trim() === "") {
    throw new Error(
      "[github-personality-analyser] config.groqApiKey is missing or empty."
    );
  }
}

function validateUsername(username: string): void {
  if (!username || username.trim() === "") {
    throw new Error(
      "[github-personality-analyser] username is required and cannot be empty."
    );
  }
  if (!/^[a-zA-Z0-9-]+$/.test(username)) {
    throw new Error(
      `[github-personality-analyser] "${username}" is not a valid GitHub username.`
    );
  }
}