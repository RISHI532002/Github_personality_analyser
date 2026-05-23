# github-personality-analyser

> Analyse any GitHub user's developer personality using their public activity and AI (Groq).

Ever wondered what your GitHub profile says about you as a developer?
This library digs into any public GitHub account — commits, languages, activity patterns, README quality, and more — and generates a fun, surprisingly accurate developer personality profile powered by LLaMA 3.3 running on Groq.

Find out if you're **The Silent Builder**, **The Midnight Hacker**, **The Open Source Evangelist**, or something else entirely. Great for portfolio pages, developer tools, or just satisfying your curiosity.

## Install

```bash
npm install github-personality-analyser
```

## Quick Start

```typescript
import { analyseGitHubPersonality } from "github-personality-analyser";

const result = await analyseGitHubPersonality("torvalds", {
  githubToken: "ghp_xxxxxxxxxxxxxxxxxxxx",
  groqApiKey: "gsk_xxxxxxxxxxxxxxxxxxxx",
});

console.log(result.archetype);       // "The Ruthless Architect"
console.log(result.summary);         // full personality summary
console.log(result.roastLine);       // 😄
```

## API Keys

| Key | Where to get it | Free? |
|-----|----------------|-------|
| `githubToken` | [github.com](https://github.com) → Settings → Developer Settings → Personal Access Tokens | ✅ Yes |
| `groqApiKey` | [console.groq.com](https://console.groq.com) → API Keys | ✅ Yes |

## Functions

### `analyseGitHubPersonality(username, config)` — Full Pipeline
Fetches GitHub data and analyses personality in one call.

```typescript
const result = await analyseGitHubPersonality("gaearon", {
  githubToken: "...",
  groqApiKey: "...",
});
```

### `getGitHubData(username, config)` — Data Only
Fetch only the raw GitHub data without AI analysis.

```typescript
import { getGitHubData } from "github-personality-analyser";

const data = await getGitHubData("sindresorhus", {
  githubToken: "...",
  groqApiKey: "...",
});

console.log(data.mostUsedLanguage);     // "JavaScript"
console.log(data.totalStarsReceived);   // 50000
console.log(data.profile.followers);    // 45000
```

### `getPersonalityFromData(githubData, config)` — AI Only
Run AI analysis on already-fetched GitHub data. Useful if you want to cache the data and re-run analysis.

```typescript
import { getGitHubData, getPersonalityFromData } from "github-personality-analyser";

const data = await getGitHubData("username", config);

// run analysis multiple times on same data
const personality = await getPersonalityFromData(data, config);
```

## Result Shape — `PersonalityResult`

```typescript
{
  archetype: string;           // "The Midnight Systems Architect"
  archetypeEmoji: string;      // "🏗️"
  summary: string;             // 2-3 sentence personality summary
  workStyle: string;           // when and how they work
  communicationStyle: string;  // based on commit messages
  strengths: string[];         // 3 key strengths
  funFacts: string[];          // 3 fun observations
  techIdentity: string;        // relationship with tech/languages
  collaborationStyle: string;  // solo wolf or team player
  developerQuote: string;      // a made-up fitting quote
  roastLine: string;           // one funny roast line 😄
}
```

## GitHub Data Shape — `GitHubData`

```typescript
{
  profile: UserProfile;              // name, bio, location, followers...
  repositories: Repository[];        // all public repos
  languages: Record<string, number>; // language → bytes
  commits: CommitInfo[];             // recent commit messages + timing
  commitHours: number[];             // hours of day they commit
  commitDays: string[];              // days of week they commit
  activity: ActivitySummary;         // push/PR/issue counts
  topReadme: string | null;          // README content
  totalStarsReceived: number;        // total stars across all repos
  mostUsedLanguage: string | null;   // top language
}
```

## Requirements

- Node.js 18+
- A free GitHub account with a Personal Access Token
- A free Groq account with an API key

## License

MIT