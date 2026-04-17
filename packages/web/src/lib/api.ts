export interface PRAuthor {
  login: string;
  avatarUrl: string;
}

export interface PRMetadata {
  number: number;
  title: string;
  body: string;
  author: PRAuthor;
  branch: { head: string; base: string };
  labels: string[];
  state: "open" | "closed" | "merged";
}

export interface PRFile {
  path: string;
  status: "added" | "modified" | "removed" | "renamed";
  patch: string;
  previousPath?: string;
}

export interface PRComment {
  id: number;
  author: PRAuthor;
  body: string;
  createdAt: string;
  type: "pr" | "inline";
  path?: string;
  line?: number;
  side?: "LEFT" | "RIGHT";
  inReplyToId?: number;
}

export interface PRCommit {
  sha: string;
  message: string;
  author: { login: string };
  date: string;
}

export interface PRPayload {
  pr: PRMetadata;
  files: PRFile[];
  fileOrder: string[];
  comments: PRComment[];
  commits: PRCommit[];
}

const BASE = "";

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error: string }).error || res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getPR: () => fetchJSON<PRPayload>("/api/pr"),

  getDiff: (commit?: string) =>
    fetchJSON<{ files: PRFile[]; fileOrder: string[] }>(
      commit ? `/api/pr/diff?commit=${commit}` : "/api/pr/diff"
    ),

  postComment: (body: string) =>
    fetchJSON<PRComment>("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    }),

  postInlineComment: (params: {
    body: string;
    path: string;
    line: number;
    side: string;
    startLine?: number;
    startSide?: string;
  }) =>
    fetchJSON<PRComment>("/api/comments/inline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }),

  replyToComment: (commentId: number, body: string) =>
    fetchJSON<PRComment>("/api/comments/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, commentId }),
    }),

  submitReview: (
    event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
    body?: string
  ) =>
    fetchJSON<{ ok: boolean }>("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, body }),
    }),

  poll: () => fetchJSON<{ comments: PRComment[] }>("/api/poll"),
};
