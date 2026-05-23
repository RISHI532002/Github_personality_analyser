import { Octokit } from "@octokit/rest";
import { AnalyserConfig } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  username: string;
  name: string | null;
  bio: string | null;
  location: string | null;
  company: string | null;
  email: string | null;
  blog: string | null;
  followers: number;
  following: number;
  publicRepos: number;
  accountCreatedAt: string;
  accountAgeYears: number;
  avatarUrl: string;
  hireable: boolean | null;
}

export interface Repository {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  topics: string[];
  isForked: boolean;
  hasReadme: boolean;
  createdAt: string;
  updatedAt: string;
  size: number;
}

export interface CommitInfo {
  message: string;
  hourOfDay: number;
  dayOfWeek: string;
  repoName: string;
}

export interface ActivitySummary {
  pushCount: number;
  pullRequestCount: number;
  issueCount: number;
  forkCount: number;
  watchCount: number;
  reviewCount: number;
  totalEvents: number;
}

export interface GitHubData {
  profile: UserProfile;
  repositories: Repository[];
  languages: Record<string, number>;
  commits: CommitInfo[];
  commitHours: number[];
  commitDays: string[];
  activity: ActivitySummary;
  topReadme: string | null;
  totalStarsReceived: number;
  mostUsedLanguage: string | null;
}

// ─── Helper: Get Day Name ─────────────────────────────────────────────────────

function getDayName(dateStr: string): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[new Date(dateStr).getDay()];
}

// ─── 1. Fetch User Profile ────────────────────────────────────────────────────

async function fetchProfile(octokit: Octokit, username: string): Promise<UserProfile> {
  const { data } = await octokit.rest.users.getByUsername({ username });

  const createdAt = data.created_at;
  const accountAgeYears = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365)
  );

  return {
    username: data.login,
    name: data.name ?? null,
    bio: data.bio ?? null,
    location: data.location ?? null,
    company: data.company ?? null,
    email: data.email ?? null,
    blog: data.blog ?? null,
    followers: data.followers,
    following: data.following,
    publicRepos: data.public_repos,
    accountCreatedAt: createdAt,
    accountAgeYears,
    avatarUrl: data.avatar_url,
    hireable: data.hireable ?? null,
  };
}

// ─── 2. Fetch Repositories ────────────────────────────────────────────────────

async function fetchRepositories(octokit: Octokit, username: string): Promise<Repository[]> {
  const { data } = await octokit.rest.repos.listForUser({
    username,
    per_page: 100,
    sort: "updated",
    type: "owner",
  });

  return data.map((repo) => ({
    name: repo.name,
    description: repo.description ?? null,
    language: repo.language ?? null,
    stars: repo.stargazers_count ?? 0,
    forks: repo.forks_count ?? 0,
    topics: repo.topics ?? [],
    isForked: repo.fork,
    hasReadme: false,
    createdAt: repo.created_at ?? "",
    updatedAt: repo.updated_at ?? "",
    size: repo.size ?? 0,
  }));
}

// ─── 3. Fetch Languages ───────────────────────────────────────────────────────

async function fetchLanguages(
  octokit: Octokit,
  username: string,
  repos: Repository[]
): Promise<Record<string, number>> {
  const topRepos = [...repos].sort((a, b) => b.stars - a.stars).slice(0, 10);

  const languageMaps = await Promise.all(
    topRepos.map(async (repo) => {
      try {
        const { data } = await octokit.rest.repos.listLanguages({
          owner: username,
          repo: repo.name,
        });
        return data as Record<string, number>;
      } catch {
        return {} as Record<string, number>;
      }
    })
  );

  const combined: Record<string, number> = {};
  for (const langMap of languageMaps) {
    for (const [lang, bytes] of Object.entries(langMap)) {
      combined[lang] = (combined[lang] ?? 0) + bytes;
    }
  }

  return combined;
}

// ─── 4. Fetch Commits ─────────────────────────────────────────────────────────

async function fetchCommits(
  octokit: Octokit,
  username: string,
  repos: Repository[]
): Promise<CommitInfo[]> {
  const targetRepos = repos
    .filter((r) => !r.isForked)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const commitArrays = await Promise.all(
    targetRepos.map(async (repo) => {
      try {
        const { data } = await octokit.rest.repos.listCommits({
          owner: username,
          repo: repo.name,
          author: username,
          per_page: 20,
        });

        return data.map((commit): CommitInfo => {
          const dateStr = commit.commit.author?.date ?? new Date().toISOString();
          return {
            message: commit.commit.message.split("\n")[0],
            hourOfDay: new Date(dateStr).getHours(),
            dayOfWeek: getDayName(dateStr),
            repoName: repo.name,
          };
        });
      } catch {
        return [];
      }
    })
  );

  return commitArrays.flat();
}

// ─── 5. Fetch Activity ────────────────────────────────────────────────────────

async function fetchActivity(octokit: Octokit, username: string): Promise<ActivitySummary> {
  const { data } = await octokit.rest.activity.listPublicEventsForUser({
    username,
    per_page: 100,
  });

  const summary: ActivitySummary = {
    pushCount: 0,
    pullRequestCount: 0,
    issueCount: 0,
    forkCount: 0,
    watchCount: 0,
    reviewCount: 0,
    totalEvents: data.length,
  };

  for (const event of data) {
    switch (event.type) {
      case "PushEvent": summary.pushCount++; break;
      case "PullRequestEvent": summary.pullRequestCount++; break;
      case "IssuesEvent": summary.issueCount++; break;
      case "ForkEvent": summary.forkCount++; break;
      case "WatchEvent": summary.watchCount++; break;
      case "PullRequestReviewEvent": summary.reviewCount++; break;
    }
  }

  return summary;
}

// ─── 6. Fetch README ──────────────────────────────────────────────────────────

async function fetchTopReadme(
  octokit: Octokit,
  username: string,
  repos: Repository[]
): Promise<string | null> {
  const candidates = [
    username,
    ...repos
      .filter((r) => !r.isForked)
      .sort((a, b) => b.stars - a.stars)
      .slice(0, 3)
      .map((r) => r.name),
  ];

  for (const repoName of candidates) {
    try {
      const { data } = await octokit.rest.repos.getReadme({
        owner: username,
        repo: repoName,
      });
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      return content.slice(0, 3000);
    } catch {
      continue;
    }
  }

  return null;
}

// ─── 7. Derived Fields ────────────────────────────────────────────────────────

function computeDerivedFields(
  repos: Repository[],
  languages: Record<string, number>,
  commits: CommitInfo[]
) {
  const totalStarsReceived = repos.reduce((sum, r) => sum + r.stars, 0);
  const mostUsedLanguage =
    Object.entries(languages).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;
  const commitHours = commits.map((c) => c.hourOfDay);
  const commitDays = commits.map((c) => c.dayOfWeek);

  return { totalStarsReceived, mostUsedLanguage, commitHours, commitDays };
}

// ─── Main Exported Function ───────────────────────────────────────────────────

export async function fetchGitHubData(
  username: string,
  config: AnalyserConfig
): Promise<GitHubData> {
  // Octokit is now created with the user-provided token
  const octokit = new Octokit({ auth: config.githubToken });

  const [profile, repositories, activity] = await Promise.all([
    fetchProfile(octokit, username),
    fetchRepositories(octokit, username),
    fetchActivity(octokit, username),
  ]);

  const [languages, commits, topReadme] = await Promise.all([
    fetchLanguages(octokit, username, repositories),
    fetchCommits(octokit, username, repositories),
    fetchTopReadme(octokit, username, repositories),
  ]);

  const { totalStarsReceived, mostUsedLanguage, commitHours, commitDays } =
    computeDerivedFields(repositories, languages, commits);

  return {
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
  };
}