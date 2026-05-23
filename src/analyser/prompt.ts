import type { GitHubData } from "../github/fetcher.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PersonalityResult {
  archetype: string;            // e.g. "The Silent Builder"
  archetypeEmoji: string;
  summary: string;              // 2-3 line personality summary
  workStyle: string;            // how/when they work
  communicationStyle: string;   // based on commit messages & issues
  strengths: string[];          // 3 key strengths
  funFacts: string[];           // 2-3 fun observations
  techIdentity: string;         // their relationship with tech/languages
  collaborationStyle: string;   // solo wolf or team player
  developerQuote: string;       // a made-up quote that fits their personality
  roastLine: string;            // one funny roast line
}


function analyseCommitTiming(commitHours: number[]): string {
  if (commitHours.length === 0) return "unknown schedule";

  const avg = commitHours.reduce((a, b) => a + b, 0) / commitHours.length;

  const nightOwl = commitHours.filter((h) => h >= 22 || h <= 4).length;
  const earlyBird = commitHours.filter((h) => h >= 5 && h <= 9).length;
  const officer = commitHours.filter((h) => h >= 9 && h <= 17).length;
  const eveningCoder = commitHours.filter((h) => h >= 17 && h <= 22).length;

  const total = commitHours.length;
  const nightPct = Math.round((nightOwl / total) * 100);
  const earlyPct = Math.round((earlyBird / total) * 100);
  const officePct = Math.round((officer / total) * 100);
  const eveningPct = Math.round((eveningCoder / total) * 100);

  return [
    `Average commit hour: ${Math.round(avg)}:00`,
    `Night owl commits (10pm–4am): ${nightPct}%`,
    `Early bird commits (5am–9am): ${earlyPct}%`,
    `Office hours commits (9am–5pm): ${officePct}%`,
    `Evening commits (5pm–10pm): ${eveningPct}%`,
  ].join("\n");
}


function analyseCommitDays(commitDays: string[]): string {
  if (commitDays.length === 0) return "unknown days";

  const dayCounts: Record<string, number> = {};
  for (const day of commitDays) {
    dayCounts[day] = (dayCounts[day] ?? 0) + 1;
  }

  const weekendDays = ["Saturday", "Sunday"];
  const weekendCommits = commitDays.filter((d) => weekendDays.includes(d)).length;
  const weekdayCommits = commitDays.length - weekendCommits;
  const weekendPct = Math.round((weekendCommits / commitDays.length) * 100);

  const topDay = Object.entries(dayCounts).sort(([, a], [, b]) => b - a)[0]?.[0];

  return [
    `Most active day: ${topDay}`,
    `Weekday commits: ${weekdayCommits} | Weekend commits: ${weekendCommits} (${weekendPct}% weekend)`,
    `Day breakdown: ${Object.entries(dayCounts)
      .map(([d, c]) => `${d}: ${c}`)
      .join(", ")}`,
  ].join("\n");
}


function analyseCommitMessages(messages: string[]): string {
  if (messages.length === 0) return "No commit messages found.";

  const avgLength = Math.round(
    messages.reduce((sum, m) => sum + m.length, 0) / messages.length
  );

  const hasEmoji = messages.filter((m) => /\p{Emoji}/u.test(m)).length;
  const hasConventional = messages.filter((m) =>
    /^(feat|fix|chore|docs|style|refactor|test|perf)(\(.+\))?:/i.test(m)
  ).length;
  const hasCaps = messages.filter((m) => m[0] === m[0]?.toUpperCase()).length;
  const veryShort = messages.filter((m) => m.length < 15).length;
  const veryLong = messages.filter((m) => m.length > 72).length;

  const emojiPct = Math.round((hasEmoji / messages.length) * 100);
  const conventionalPct = Math.round((hasConventional / messages.length) * 100);

  return [
    `Total commit messages analysed: ${messages.length}`,
    `Average message length: ${avgLength} characters`,
    `Uses emoji in commits: ${emojiPct}%`,
    `Follows conventional commits: ${conventionalPct}%`,
    `Starts with capital letter: ${hasCaps}/${messages.length}`,
    `Very short messages (<15 chars): ${veryShort}`,
    `Very long messages (>72 chars): ${veryLong}`,
    `Sample messages:\n${messages.slice(0, 8).map((m) => `  - "${m}"`).join("\n")}`,
  ].join("\n");
}


function analyseLanguages(languages: Record<string, number>): string {
  if (Object.keys(languages).length === 0) return "No language data found.";

  const sorted = Object.entries(languages).sort(([, a], [, b]) => b - a);
  const total = sorted.reduce((sum, [, b]) => sum + b, 0);

  const topLanguages = sorted.slice(0, 6).map(([lang, bytes]) => {
    const pct = Math.round((bytes / total) * 100);
    return `${lang}: ${pct}%`;
  });

  const isPolyglot = sorted.length >= 5;
  const isSpecialist = sorted.length <= 2;

  return [
    `Languages used (${sorted.length} total):`,
    topLanguages.join(" | "),
    isPolyglot ? "Profile: Polyglot developer (5+ languages)" : "",
    isSpecialist ? "Profile: Specialist (1-2 languages)" : "",
  ]
    .filter(Boolean)
    .join("\n");
}


function analyseRepositories(repos: any[]): string {
  if (repos.length === 0) return "No repositories found.";

  const nonForked = repos.filter((r: any) => !r.isForked);
  const forked = repos.filter((r: any) => r.isForked);
  const withDescription = repos.filter((r: any) => r.description).length;
  const withTopics = repos.filter((r: any) => r.topics?.length > 0).length;

  const topStarred = [...repos]
    .sort((a: any, b: any) => b.stars - a.stars)
    .slice(0, 5)
    .map((r: any) => `"${r.name}" (⭐ ${r.stars})`);

  const allTopics = repos
    .flatMap((r: any) => r.topics ?? [])
    .reduce((acc: Record<string, number>, t: string) => {
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    }, {});

  const topTopics = Object.entries(allTopics)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 6)
    .map(([t]) => t);

  return [
    `Total repos: ${repos.length} (${nonForked.length} original, ${forked.length} forked)`,
    `Repos with description: ${withDescription}/${repos.length}`,
    `Repos with topics/tags: ${withTopics}/${repos.length}`,
    `Top starred repos: ${topStarred.join(", ")}`,
    topTopics.length > 0 ? `Common topics: ${topTopics.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}


function analyseActivity(activity: GitHubData["activity"]): string {
  const total = activity.totalEvents;
  if (total === 0) return "No recent public activity found.";

  const dominant = Object.entries({
    Pushing: activity.pushCount,
    "Opening PRs": activity.pullRequestCount,
    "Filing Issues": activity.issueCount,
    Forking: activity.forkCount,
    Reviewing: activity.reviewCount,
  })
    .sort(([, a], [, b]) => b - a)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" | ");

  return [
    `Total recent public events: ${total}`,
    dominant,
  ].join("\n");
}


export function buildPrompt(data: GitHubData): string {
  const {
    profile,
    repositories,
    languages,
    commits,
    commitHours,
    commitDays,
    activity,
    topReadme,
    totalStarsReceived,
    mostUsedLanguage,
  } = data;

  const timingAnalysis = analyseCommitTiming(commitHours);
  const dayAnalysis = analyseCommitDays(commitDays);
  const messageAnalysis = analyseCommitMessages(commits.map((c) => c.message));
  const languageAnalysis = analyseLanguages(languages);
  const repoAnalysis = analyseRepositories(repositories);
  const activityAnalysis = analyseActivity(activity);

  const prompt = `
You are a witty, insightful developer personality analyser. Based on the GitHub data below, generate a fun and accurate personality profile for this developer.

═══════════════════════════════════════════
GITHUB DATA FOR: @${profile.username}
═══════════════════════════════════════════

PROFILE
──────────
Name: ${profile.name ?? "Not provided"}
Bio: ${profile.bio ?? "No bio"}
Location: ${profile.location ?? "Unknown"}
Company: ${profile.company ?? "None listed"}
Account age: ${profile.accountAgeYears} years
Followers: ${profile.followers} | Following: ${profile.following}
Total stars received: ${totalStarsReceived}
Public repos: ${profile.publicRepos}
Hireable: ${profile.hireable ?? "Not specified"}
Blog/Website: ${profile.blog ?? "None"}

REPOSITORIES
────────────────
${repoAnalysis}

LANGUAGES
─────────────
${languageAnalysis}
Most used language overall: ${mostUsedLanguage ?? "Unknown"}

COMMIT MESSAGES
───────────────────
${messageAnalysis}

COMMIT TIMING
─────────────────
${timingAnalysis}

COMMIT DAYS
───────────────
${dayAnalysis}

RECENT ACTIVITY (last 100 events)
──────────────────────────────────────
${activityAnalysis}

${
  topReadme
    ? `README SAMPLE (first 1500 chars)
──────────────────────────────────
${topReadme.slice(0, 1500)}`
    : "README: None found"
}

═══════════════════════════════════════════
YOUR TASK
═══════════════════════════════════════════

Based on ALL the data above, generate a developer personality profile. Be specific — reference actual data points (languages, commit times, repo names, message style etc). Be witty but fair.

Respond ONLY with a valid JSON object. No markdown, no backticks, no explanation. Just raw JSON.

The JSON must follow this exact structure:
{
  "archetype": "A creative 3-5 word title e.g. 'The Midnight Systems Architect'",
  "archetypeEmoji": "One relevant emoji",
  "summary": "2-3 sentence personality summary. Be specific, witty, and reference actual data.",
  "workStyle": "1-2 sentences about WHEN and HOW they work based on commit timing and activity.",
  "communicationStyle": "1-2 sentences about how they communicate based on commit messages.",
  "strengths": ["Strength 1 (be specific)", "Strength 2", "Strength 3"],
  "funFacts": ["A fun specific observation from the data", "Another fun fact", "One more"],
  "techIdentity": "1-2 sentences about their relationship with technology and languages.",
  "collaborationStyle": "1-2 sentences — are they a solo builder or team player? Based on forks, PRs, reviews.",
  "developerQuote": "A made-up quote that perfectly fits this developer's personality. Make it funny/insightful.",
  "roastLine": "One short, funny, affectionate roast line based on something specific in their data."
}
`.trim();

  return prompt;
}