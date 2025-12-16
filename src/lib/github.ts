import { Buffer } from "node:buffer";

const owner = process.env.GITHUB_REPO_OWNER ?? "";
const repo = process.env.GITHUB_REPO_NAME ?? "";
const branch = process.env.GITHUB_TARGET_BRANCH ?? "data";
const configPath = process.env.GITHUB_CONFIG_PATH ?? "redirects.json";

const apiBase = "https://api.github.com";

export interface RedirectConfigPayload {
  content: string;
  sha: string;
  path: string;
  htmlUrl?: string;
  lastModified?: string;
}

export interface CommitEntry {
  sha: string;
  message: string;
  author?: {
    name?: string;
    avatarUrl?: string;
    date?: string;
  };
  url: string;
}

function requireAccessToken(token: string | undefined): string {
  if (!token) {
    throw new Error("Missing GitHub access token in session.");
  }
  return token;
}

function buildHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json"
  } satisfies Record<string, string>;
}

function ensureRepoConfig(): { owner: string; repo: string; url: string } {
  if (!owner || !repo) {
    throw new Error("Missing GITHUB_REPO_OWNER or GITHUB_REPO_NAME environment variables.");
  }
  return {
    owner,
    repo,
    url: `${apiBase}/repos/${owner}/${repo}/contents/${configPath}`
  };
}

export async function getRedirectConfig(accessToken: string): Promise<RedirectConfigPayload> {
  const { url } = ensureRepoConfig();
  const token = requireAccessToken(accessToken);
  const response = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, {
    headers: buildHeaders(token),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to load config from GitHub: ${response.status} ${response.statusText}`);
  }

  const json = (await response.json()) as {
    content: string;
    sha: string;
    path: string;
    html_url?: string;
  };

  const rawContent = Buffer.from(json.content, "base64").toString("utf-8");

  return {
    content: rawContent,
    sha: json.sha,
    path: json.path,
    htmlUrl: json.html_url,
    lastModified: response.headers.get("last-modified") ?? undefined
  };
}

export interface UpdateRedirectConfigInput {
  content: string;
  sha: string;
  message?: string;
}

export interface UpdateRedirectConfigResult {
  sha: string;
  commitUrl: string;
}

export async function updateRedirectConfig(accessToken: string, input: UpdateRedirectConfigInput): Promise<UpdateRedirectConfigResult> {
  const { url } = ensureRepoConfig();
  const token = requireAccessToken(accessToken);
  const { content, sha, message } = input;
  const response = await fetch(url, {
    method: "PUT",
    headers: buildHeaders(token),
    body: JSON.stringify({
      message: message ?? "Update redirects via WebUI",
      content: Buffer.from(content, "utf-8").toString("base64"),
      sha,
      branch
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to update config: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const json = (await response.json()) as {
    content: { sha: string; html_url?: string };
    commit: { html_url: string };
  };

  return {
    sha: json.content.sha,
    commitUrl: json.commit.html_url
  };
}

export async function listRedirectHistory(accessToken: string, perPage = 10): Promise<CommitEntry[]> {
  const { owner: repoOwner, repo: repoName } = ensureRepoConfig();
  const token = requireAccessToken(accessToken);
  const url = new URL(`${apiBase}/repos/${repoOwner}/${repoName}/commits`);
  url.searchParams.set("path", configPath);
  url.searchParams.set("sha", branch);
  url.searchParams.set("per_page", String(perPage));

  const response = await fetch(url, {
    headers: buildHeaders(token),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to load commit history: ${response.status} ${response.statusText}`);
  }

  const json = (await response.json()) as Array<{
    sha: string;
    html_url: string;
    commit: { message: string; author?: { name?: string; date?: string } };
    author?: { avatar_url?: string; login?: string };
  }>;

  return json.map((item) => ({
    sha: item.sha,
    url: item.html_url,
    message: item.commit.message,
    author: {
      name: item.author?.login ?? item.commit.author?.name,
      avatarUrl: item.author?.avatar_url,
      date: item.commit.author?.date
    }
  }));
}
