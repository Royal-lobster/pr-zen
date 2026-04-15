# PR Zen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first PR review tool with dependency-ordered file navigation and a minimal three-panel web UI.

**Architecture:** Bun monorepo with two packages — a CLI that fetches GitHub data and serves an HTTP API, and a React+Vite web UI that renders diffs using @pierre/diffs. The CLI proxies all GitHub API calls so no tokens reach the browser. Dependency ordering uses madge+toposort on local JS/TS source files.

**Tech Stack:** Bun, React, Vite, Tailwind CSS, @pierre/diffs, @tanstack/virtual (unused — @pierre/diffs has built-in Virtualizer), octokit, madge, toposort

---

## Phase Overview

| Phase | Branch | Base | Description |
|-------|--------|------|-------------|
| 1 | `phase-1/cli-server` | `main` | Monorepo scaffolding + CLI server with all API routes |
| 2 | `phase-2/web-ui-foundation` | `phase-1/cli-server` | React app with three-panel layout, context provider, all panels |
| 3 | `phase-3/diff-view` | `phase-2/web-ui-foundation` | Diff rendering with @pierre/diffs, annotations, line selection |
| 4 | `phase-4/interactive-features` | `phase-3/diff-view` | Comments, reviews, keyboard shortcuts, command palette, zen mode, polling |

---

## Phase 1: Monorepo Scaffolding & CLI Server

### Task 1.1: Root Workspace Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`

- [ ] **Step 1: Create root package.json with Bun workspaces**

```json
{
  "name": "pr-zen",
  "private": true,
  "workspaces": ["packages/*"]
}
```

- [ ] **Step 2: Create root tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "outDir": "dist",
    "declaration": true,
    "resolveJsonModule": true
  }
}
```

- [ ] **Step 3: Create .gitignore**

```
node_modules/
dist/
.env
*.log
.vite/
```

- [ ] **Step 4: Commit**

```bash
git add package.json tsconfig.json .gitignore
git commit -m "chore: initialize monorepo with Bun workspaces"
```

### Task 1.2: CLI Package Scaffolding

**Files:**
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`

- [ ] **Step 1: Create CLI package.json**

```json
{
  "name": "@pr-zen/cli",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "bin": {
    "pr-zen": "./src/index.ts"
  },
  "dependencies": {
    "@octokit/rest": "^21.1.1",
    "madge": "^8.0.0",
    "toposort": "^2.0.2"
  },
  "devDependencies": {
    "@types/toposort": "^2.0.7",
    "@types/bun": "latest"
  }
}
```

- [ ] **Step 2: Create CLI tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Install dependencies**

```bash
cd packages/cli && bun install
```

- [ ] **Step 4: Commit**

```bash
git add packages/cli/package.json packages/cli/tsconfig.json
git commit -m "chore: scaffold CLI package with dependencies"
```

### Task 1.3: GitHub API Module

**Files:**
- Create: `packages/cli/src/github.ts`

- [ ] **Step 1: Write github.ts — octokit wrapper with gh auth token**

```typescript
import { Octokit } from "@octokit/rest";

let octokit: Octokit | null = null;

async function getAuthToken(): Promise<string> {
  const proc = Bun.spawn(["gh", "auth", "token"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const output = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(
      "Failed to get gh auth token. Make sure `gh` CLI is installed and authenticated."
    );
  }
  return output.trim();
}

async function getOctokit(): Promise<Octokit> {
  if (!octokit) {
    const token = await getAuthToken();
    octokit = new Octokit({ auth: token });
  }
  return octokit;
}

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
  comments: PRComment[];
  commits: PRCommit[];
}

export async function fetchPR(
  owner: string,
  repo: string,
  prNumber: number
): Promise<PRPayload> {
  const kit = await getOctokit();

  const [prRes, filesRes, commentsRes, reviewCommentsRes, commitsRes] =
    await Promise.all([
      kit.pulls.get({ owner, repo, pull_number: prNumber }),
      kit.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber,
        per_page: 300,
      }),
      kit.issues.listComments({
        owner,
        repo,
        issue_number: prNumber,
        per_page: 100,
      }),
      kit.pulls.listReviewComments({
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100,
      }),
      kit.pulls.listCommits({
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100,
      }),
    ]);

  const pr: PRMetadata = {
    number: prRes.data.number,
    title: prRes.data.title,
    body: prRes.data.body ?? "",
    author: {
      login: prRes.data.user?.login ?? "unknown",
      avatarUrl: prRes.data.user?.avatar_url ?? "",
    },
    branch: {
      head: prRes.data.head.ref,
      base: prRes.data.base.ref,
    },
    labels: prRes.data.labels.map((l) =>
      typeof l === "string" ? l : l.name ?? ""
    ),
    state: prRes.data.merged
      ? "merged"
      : (prRes.data.state as "open" | "closed"),
  };

  const files: PRFile[] = filesRes.data.map((f) => ({
    path: f.filename,
    status: f.status as PRFile["status"],
    patch: f.patch ?? "",
    previousPath:
      f.status === "renamed" ? f.previous_filename : undefined,
  }));

  const prComments: PRComment[] = commentsRes.data.map((c) => ({
    id: c.id,
    author: {
      login: c.user?.login ?? "unknown",
      avatarUrl: c.user?.avatar_url ?? "",
    },
    body: c.body ?? "",
    createdAt: c.created_at,
    type: "pr" as const,
  }));

  const inlineComments: PRComment[] = reviewCommentsRes.data.map((c) => ({
    id: c.id,
    author: {
      login: c.user?.login ?? "unknown",
      avatarUrl: c.user?.avatar_url ?? "",
    },
    body: c.body,
    createdAt: c.created_at,
    type: "inline" as const,
    path: c.path,
    line: c.line ?? c.original_line ?? undefined,
    side: c.side as "LEFT" | "RIGHT" | undefined,
    inReplyToId: c.in_reply_to_id ?? undefined,
  }));

  const comments = [...prComments, ...inlineComments].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const commits: PRCommit[] = commitsRes.data.map((c) => ({
    sha: c.sha,
    message: c.commit.message,
    author: { login: c.author?.login ?? c.commit.author?.name ?? "unknown" },
    date: c.commit.author?.date ?? "",
  }));

  return { pr, files, comments, commits };
}

export async function fetchCommitDiff(
  owner: string,
  repo: string,
  sha: string
): Promise<PRFile[]> {
  const kit = await getOctokit();
  const res = await kit.repos.getCommit({ owner, repo, ref: sha });
  return (res.data.files ?? []).map((f) => ({
    path: f.filename,
    status: f.status as PRFile["status"],
    patch: f.patch ?? "",
    previousPath:
      f.status === "renamed" ? f.previous_filename : undefined,
  }));
}

export async function postComment(
  owner: string,
  repo: string,
  prNumber: number,
  body: string
): Promise<PRComment> {
  const kit = await getOctokit();
  const res = await kit.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body,
  });
  return {
    id: res.data.id,
    author: {
      login: res.data.user?.login ?? "unknown",
      avatarUrl: res.data.user?.avatar_url ?? "",
    },
    body: res.data.body ?? "",
    createdAt: res.data.created_at,
    type: "pr",
  };
}

export async function postInlineComment(
  owner: string,
  repo: string,
  prNumber: number,
  params: { body: string; path: string; line: number; side: string }
): Promise<PRComment> {
  const kit = await getOctokit();
  const commitRes = await kit.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });
  const res = await kit.pulls.createReviewComment({
    owner,
    repo,
    pull_number: prNumber,
    commit_id: commitRes.data.head.sha,
    body: params.body,
    path: params.path,
    line: params.line,
    side: params.side as "LEFT" | "RIGHT",
  });
  return {
    id: res.data.id,
    author: {
      login: res.data.user?.login ?? "unknown",
      avatarUrl: res.data.user?.avatar_url ?? "",
    },
    body: res.data.body,
    createdAt: res.data.created_at,
    type: "inline",
    path: res.data.path,
    line: res.data.line ?? undefined,
    side: res.data.side as "LEFT" | "RIGHT" | undefined,
  };
}

export async function replyToComment(
  owner: string,
  repo: string,
  prNumber: number,
  commentId: number,
  body: string
): Promise<PRComment> {
  const kit = await getOctokit();
  const res = await kit.pulls.createReplyForReviewComment({
    owner,
    repo,
    pull_number: prNumber,
    comment_id: commentId,
    body,
  });
  return {
    id: res.data.id,
    author: {
      login: res.data.user?.login ?? "unknown",
      avatarUrl: res.data.user?.avatar_url ?? "",
    },
    body: res.data.body,
    createdAt: res.data.created_at,
    type: "inline",
    path: res.data.path,
    line: res.data.line ?? undefined,
    side: res.data.side as "LEFT" | "RIGHT" | undefined,
    inReplyToId: res.data.in_reply_to_id ?? undefined,
  };
}

export async function submitReview(
  owner: string,
  repo: string,
  prNumber: number,
  event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
  body?: string
): Promise<void> {
  const kit = await getOctokit();
  await kit.pulls.createReview({
    owner,
    repo,
    pull_number: prNumber,
    event,
    body: body ?? "",
  });
}

export async function fetchCommentsSince(
  owner: string,
  repo: string,
  prNumber: number,
  since: string
): Promise<PRComment[]> {
  const kit = await getOctokit();
  const [commentsRes, reviewCommentsRes] = await Promise.all([
    kit.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
      since,
      per_page: 100,
    }),
    kit.pulls.listReviewComments({
      owner,
      repo,
      pull_number: prNumber,
      since,
      per_page: 100,
    }),
  ]);

  const prComments: PRComment[] = commentsRes.data
    .filter((c) => new Date(c.created_at) > new Date(since))
    .map((c) => ({
      id: c.id,
      author: {
        login: c.user?.login ?? "unknown",
        avatarUrl: c.user?.avatar_url ?? "",
      },
      body: c.body ?? "",
      createdAt: c.created_at,
      type: "pr" as const,
    }));

  const inlineComments: PRComment[] = reviewCommentsRes.data
    .filter((c) => new Date(c.created_at) > new Date(since))
    .map((c) => ({
      id: c.id,
      author: {
        login: c.user?.login ?? "unknown",
        avatarUrl: c.user?.avatar_url ?? "",
      },
      body: c.body,
      createdAt: c.created_at,
      type: "inline" as const,
      path: c.path,
      line: c.line ?? c.original_line ?? undefined,
      side: c.side as "LEFT" | "RIGHT" | undefined,
      inReplyToId: c.in_reply_to_id ?? undefined,
    }));

  return [...prComments, ...inlineComments].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/cli/src/github.ts
git commit -m "feat: add GitHub API module with octokit and gh auth"
```

### Task 1.4: Dependency Analysis Module

**Files:**
- Create: `packages/cli/src/deps.ts`

- [ ] **Step 1: Write deps.ts — madge + toposort integration**

```typescript
import madge from "madge";
import toposort from "toposort";

export type OrderingMode = "bottom-up" | "top-down";

export async function getFileOrder(
  changedFiles: string[],
  repoRoot: string,
  mode: OrderingMode = "bottom-up"
): Promise<string[]> {
  const jstsFiles = changedFiles.filter((f) =>
    /\.(js|jsx|ts|tsx|mjs|cjs)$/.test(f)
  );
  const otherFiles = changedFiles.filter(
    (f) => !/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(f)
  );

  if (jstsFiles.length === 0) {
    return changedFiles;
  }

  let sortedJsTs: string[];
  try {
    const result = await madge(repoRoot, {
      fileExtensions: ["js", "jsx", "ts", "tsx", "mjs", "cjs"],
      tsConfig: undefined,
      detectiveOptions: {
        ts: { skipTypeImports: true },
        es6: { mixedImports: true },
      },
    });

    const fullGraph = result.obj();
    const changedSet = new Set(jstsFiles);

    // Build edges only between changed files
    const edges: [string, string][] = [];
    for (const [file, deps] of Object.entries(fullGraph)) {
      if (!changedSet.has(file)) continue;
      for (const dep of deps) {
        if (changedSet.has(dep)) {
          // edge: file depends on dep → dep should come before file
          edges.push([dep, file]);
        }
      }
    }

    // Find files with no edges among changed files
    const filesInEdges = new Set(edges.flat());
    const isolatedFiles = jstsFiles.filter((f) => !filesInEdges.has(f));

    try {
      sortedJsTs = toposort.array(jstsFiles, edges);
    } catch {
      // Circular dependency — toposort throws, fall back to partial ordering
      // Break cycles by removing back-edges and retry
      sortedJsTs = jstsFiles;
    }

    // Append isolated files at the end
    const sortedSet = new Set(sortedJsTs);
    for (const f of isolatedFiles) {
      if (!sortedSet.has(f)) {
        sortedJsTs.push(f);
      }
    }
  } catch {
    // madge failed (e.g., no valid source tree) — fall back to original order
    sortedJsTs = jstsFiles;
  }

  if (mode === "top-down") {
    sortedJsTs.reverse();
  }

  return [...sortedJsTs, ...otherFiles];
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/cli/src/deps.ts
git commit -m "feat: add dependency analysis with madge and toposort"
```

### Task 1.5: HTTP Server

**Files:**
- Create: `packages/cli/src/server.ts`

- [ ] **Step 1: Write server.ts — Bun HTTP server with all API routes**

```typescript
import type { PRPayload, PRFile, PRComment } from "./github";
import {
  fetchPR,
  fetchCommitDiff,
  postComment,
  postInlineComment,
  replyToComment,
  submitReview,
  fetchCommentsSince,
} from "./github";
import { getFileOrder } from "./deps";
import { join } from "path";

interface ServerConfig {
  owner: string;
  repo: string;
  prNumber: number;
  repoRoot: string;
  port: number;
  webDistPath: string;
}

export function startServer(config: ServerConfig): { port: number; stop: () => void } {
  let cachedPayload: (PRPayload & { fileOrder: string[] }) | null = null;
  let lastPollTime: string = new Date().toISOString();

  async function loadPR(): Promise<PRPayload & { fileOrder: string[] }> {
    const payload = await fetchPR(config.owner, config.repo, config.prNumber);
    const changedPaths = payload.files.map((f) => f.path);
    const fileOrder = await getFileOrder(changedPaths, config.repoRoot);
    lastPollTime = new Date().toISOString();
    return { ...payload, fileOrder };
  }

  async function handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    // CORS headers for local development
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      // API routes
      if (path === "/api/pr" && req.method === "GET") {
        if (!cachedPayload) {
          cachedPayload = await loadPR();
        }
        return Response.json(cachedPayload, { headers: corsHeaders });
      }

      if (path === "/api/pr/diff" && req.method === "GET") {
        const sha = url.searchParams.get("commit");
        if (!sha) {
          if (!cachedPayload) {
            cachedPayload = await loadPR();
          }
          return Response.json(
            { files: cachedPayload.files, fileOrder: cachedPayload.fileOrder },
            { headers: corsHeaders }
          );
        }
        const files = await fetchCommitDiff(config.owner, config.repo, sha);
        const fileOrder = await getFileOrder(
          files.map((f) => f.path),
          config.repoRoot
        );
        return Response.json({ files, fileOrder }, { headers: corsHeaders });
      }

      if (path === "/api/comments" && req.method === "POST") {
        const { body } = (await req.json()) as { body: string };
        const comment = await postComment(
          config.owner,
          config.repo,
          config.prNumber,
          body
        );
        if (cachedPayload) cachedPayload.comments.push(comment);
        return Response.json(comment, { headers: corsHeaders });
      }

      if (path === "/api/comments/inline" && req.method === "POST") {
        const params = (await req.json()) as {
          body: string;
          path: string;
          line: number;
          side: string;
        };
        const comment = await postInlineComment(
          config.owner,
          config.repo,
          config.prNumber,
          params
        );
        if (cachedPayload) cachedPayload.comments.push(comment);
        return Response.json(comment, { headers: corsHeaders });
      }

      if (path === "/api/comments/reply" && req.method === "POST") {
        const { body, commentId } = (await req.json()) as {
          body: string;
          commentId: number;
        };
        const comment = await replyToComment(
          config.owner,
          config.repo,
          config.prNumber,
          commentId,
          body
        );
        if (cachedPayload) cachedPayload.comments.push(comment);
        return Response.json(comment, { headers: corsHeaders });
      }

      if (path === "/api/review" && req.method === "POST") {
        const { event, body } = (await req.json()) as {
          event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT";
          body?: string;
        };
        await submitReview(
          config.owner,
          config.repo,
          config.prNumber,
          event,
          body
        );
        return Response.json({ ok: true }, { headers: corsHeaders });
      }

      if (path === "/api/poll" && req.method === "GET") {
        const newComments = await fetchCommentsSince(
          config.owner,
          config.repo,
          config.prNumber,
          lastPollTime
        );
        lastPollTime = new Date().toISOString();
        if (cachedPayload && newComments.length > 0) {
          const existingIds = new Set(cachedPayload.comments.map((c) => c.id));
          for (const c of newComments) {
            if (!existingIds.has(c.id)) {
              cachedPayload.comments.push(c);
            }
          }
        }
        return Response.json({ comments: newComments }, { headers: corsHeaders });
      }

      // Static file serving for the web UI
      const filePath = path === "/" ? "/index.html" : path;
      const fullPath = join(config.webDistPath, filePath);
      const file = Bun.file(fullPath);
      if (await file.exists()) {
        return new Response(file);
      }

      // SPA fallback
      const indexFile = Bun.file(join(config.webDistPath, "index.html"));
      if (await indexFile.exists()) {
        return new Response(indexFile);
      }

      return Response.json({ error: "Not found" }, { status: 404, headers: corsHeaders });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return Response.json({ error: message }, { status: 500, headers: corsHeaders });
    }
  }

  const server = Bun.serve({
    port: config.port,
    fetch: handleRequest,
  });

  return {
    port: server.port,
    stop: () => server.stop(),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/cli/src/server.ts
git commit -m "feat: add Bun HTTP server with all API routes"
```

### Task 1.6: CLI Entry Point

**Files:**
- Create: `packages/cli/src/index.ts`

- [ ] **Step 1: Write index.ts — parse args, detect repo, start server, open browser**

```typescript
#!/usr/bin/env bun
import { startServer } from "./server";
import { resolve, join } from "path";

function parseArgs(): { prNumber: number; owner: string; repo: string } {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log("Usage: pr-zen <pr-number> [--repo owner/repo]");
    console.log("");
    console.log("Review a GitHub PR in a minimal, zen-like UI.");
    console.log("");
    console.log("Options:");
    console.log("  --repo owner/repo  GitHub repository (auto-detected from git remote)");
    process.exit(args.length === 0 ? 1 : 0);
  }

  const prNumber = parseInt(args[0], 10);
  if (isNaN(prNumber)) {
    console.error(`Error: "${args[0]}" is not a valid PR number.`);
    process.exit(1);
  }

  let owner: string | undefined;
  let repo: string | undefined;

  const repoIdx = args.indexOf("--repo");
  if (repoIdx !== -1 && args[repoIdx + 1]) {
    const parts = args[repoIdx + 1].split("/");
    if (parts.length !== 2) {
      console.error('Error: --repo must be in "owner/repo" format.');
      process.exit(1);
    }
    owner = parts[0];
    repo = parts[1];
  }

  if (!owner || !repo) {
    // Auto-detect from git remote
    const result = Bun.spawnSync(["git", "remote", "get-url", "origin"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const remoteUrl = new TextDecoder().decode(result.stdout).trim();

    const match = remoteUrl.match(
      /(?:github\.com[:/])([^/]+)\/([^/.]+?)(?:\.git)?$/
    );
    if (!match) {
      console.error(
        "Error: Could not detect GitHub repo from git remote. Use --repo owner/repo."
      );
      process.exit(1);
    }
    owner = match[1];
    repo = match[2];
  }

  return { prNumber, owner, repo };
}

async function main() {
  const { prNumber, owner, repo } = parseArgs();
  const repoRoot = resolve(".");
  const webDistPath = join(import.meta.dir, "../../web/dist");
  const port = 4173;

  console.log(`\n  pr-zen — reviewing ${owner}/${repo}#${prNumber}\n`);
  console.log("  Fetching PR data...");

  const { port: actualPort, stop } = startServer({
    owner,
    repo,
    prNumber,
    repoRoot,
    port,
    webDistPath,
  });

  const url = `http://localhost:${actualPort}`;
  console.log(`  Server running at ${url}`);
  console.log("  Opening browser...\n");

  // Open browser
  const openCmd =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";
  Bun.spawn([openCmd, url], { stdout: "ignore", stderr: "ignore" });

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n  Shutting down...");
    stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    stop();
    process.exit(0);
  });
}

main();
```

- [ ] **Step 2: Verify it runs (will fail on web assets but server should start)**

```bash
cd packages/cli && bun run src/index.ts --help
```

Expected: Usage output printed, exits with 0.

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/index.ts
git commit -m "feat: add CLI entry point with arg parsing and browser open"
```

---

## Phase 2: Web UI Foundation & Layout

### Task 2.1: Vite + React + Tailwind Setup

**Files:**
- Create: `packages/web/package.json`
- Create: `packages/web/tsconfig.json`
- Create: `packages/web/vite.config.ts`
- Create: `packages/web/tailwind.config.ts`
- Create: `packages/web/postcss.config.js`
- Create: `packages/web/index.html`
- Create: `packages/web/src/main.tsx`
- Create: `packages/web/src/index.css`

- [ ] **Step 1: Create web package.json**

```json
{
  "name": "@pr-zen/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@pierre/diffs": "latest",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@types/react": "^19.1.2",
    "@types/react-dom": "^19.1.2",
    "@vitejs/plugin-react": "^4.4.1",
    "autoprefixer": "^10.4.21",
    "postcss": "^8.5.3",
    "tailwindcss": "^3.4.17",
    "vite": "^6.3.2",
    "typescript": "^5.8.3"
  }
}
```

- [ ] **Step 2: Create vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:4173",
    },
  },
  build: {
    outDir: "dist",
  },
});
```

- [ ] **Step 3: Create tailwind.config.ts**

```typescript
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        zen: {
          bg: "#0d1117",
          surface: "#161b22",
          border: "#30363d",
          text: "#e6edf3",
          muted: "#8b949e",
          accent: "#58a6ff",
          "add-bg": "rgba(63, 185, 80, 0.15)",
          "del-bg": "rgba(248, 81, 73, 0.15)",
          "add-text": "#3fb950",
          "del-text": "#f85149",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 4: Create postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 5: Create web tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 6: Create index.html**

```html
<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>pr-zen</title>
  </head>
  <body class="bg-zen-bg text-zen-text antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  scrollbar-width: thin;
  scrollbar-color: #30363d transparent;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 3px;
}
```

- [ ] **Step 8: Create main.tsx**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 9: Install dependencies and verify build**

```bash
cd packages/web && bun install && bun run build
```

- [ ] **Step 10: Commit**

```bash
git add packages/web/
git commit -m "chore: scaffold web package with Vite, React, and Tailwind"
```

### Task 2.2: API Client Library

**Files:**
- Create: `packages/web/src/lib/api.ts`

- [ ] **Step 1: Write api.ts — typed fetch wrapper for CLI server endpoints**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/lib/api.ts
git commit -m "feat: add typed API client for CLI server endpoints"
```

### Task 2.3: PR Context Provider

**Files:**
- Create: `packages/web/src/context/PRContext.tsx`
- Create: `packages/web/src/hooks/usePR.ts`

- [ ] **Step 1: Write PRContext.tsx**

```tsx
import { createContext, useContext, type ReactNode } from "react";
import { usePR, type PRState } from "../hooks/usePR";

const PRContext = createContext<PRState | null>(null);

export function PRProvider({ children }: { children: ReactNode }) {
  const state = usePR();
  return <PRContext.Provider value={state}>{children}</PRContext.Provider>;
}

export function usePRContext(): PRState {
  const ctx = useContext(PRContext);
  if (!ctx) throw new Error("usePRContext must be used within PRProvider");
  return ctx;
}
```

- [ ] **Step 2: Write usePR.ts**

```typescript
import { useState, useEffect, useCallback, useRef } from "react";
import {
  api,
  type PRPayload,
  type PRFile,
  type PRComment,
} from "../lib/api";

export interface PRState {
  data: PRPayload | null;
  loading: boolean;
  error: string | null;
  // Diff view state
  currentFiles: PRFile[];
  currentFileOrder: string[];
  activeCommit: string | null;
  setActiveCommit: (sha: string | null) => void;
  // Comment mutations
  addComment: (comment: PRComment) => void;
  refresh: () => Promise<void>;
}

export function usePR(): PRState {
  const [data, setData] = useState<PRPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCommit, setActiveCommitState] = useState<string | null>(null);
  const [commitFiles, setCommitFiles] = useState<PRFile[] | null>(null);
  const [commitFileOrder, setCommitFileOrder] = useState<string[] | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const payload = await api.getPR();
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch PR");
    } finally {
      setLoading(false);
    }
  }, []);

  const setActiveCommit = useCallback(async (sha: string | null) => {
    setActiveCommitState(sha);
    if (!sha) {
      setCommitFiles(null);
      setCommitFileOrder(null);
      return;
    }
    try {
      const { files, fileOrder } = await api.getDiff(sha);
      setCommitFiles(files);
      setCommitFileOrder(fileOrder);
    } catch (e) {
      console.error("Failed to fetch commit diff:", e);
    }
  }, []);

  const addComment = useCallback((comment: PRComment) => {
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, comments: [...prev.comments, comment] };
    });
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll for new comments every 30s
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const { comments: newComments } = await api.poll();
        if (newComments.length > 0) {
          setData((prev) => {
            if (!prev) return prev;
            const existingIds = new Set(prev.comments.map((c) => c.id));
            const unique = newComments.filter((c) => !existingIds.has(c.id));
            if (unique.length === 0) return prev;
            return { ...prev, comments: [...prev.comments, ...unique] };
          });
        }
      } catch {
        // Silently fail polling
      }
    }, 30_000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const currentFiles = commitFiles ?? data?.files ?? [];
  const currentFileOrder = commitFileOrder ?? data?.fileOrder ?? [];

  return {
    data,
    loading,
    error,
    currentFiles,
    currentFileOrder,
    activeCommit,
    setActiveCommit,
    addComment,
    refresh: fetchData,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/context/PRContext.tsx packages/web/src/hooks/usePR.ts
git commit -m "feat: add PR context provider with data fetching and polling"
```

### Task 2.4: Sidebar State & Review Progress Hooks

**Files:**
- Create: `packages/web/src/hooks/useSidebarState.ts`
- Create: `packages/web/src/hooks/useReviewProgress.ts`
- Create: `packages/web/src/hooks/useFileOrder.ts`

- [ ] **Step 1: Write useSidebarState.ts**

```typescript
import { useState, useCallback, useEffect } from "react";

interface SidebarState {
  leftOpen: boolean;
  rightOpen: boolean;
  toggleLeft: () => void;
  toggleRight: () => void;
}

function loadFromStorage(key: string, fallback: boolean): boolean {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? val === "true" : fallback;
  } catch {
    return fallback;
  }
}

export function useSidebarState(): SidebarState {
  const [leftOpen, setLeftOpen] = useState(() =>
    loadFromStorage("pr-zen:left-sidebar", true)
  );
  const [rightOpen, setRightOpen] = useState(() =>
    loadFromStorage("pr-zen:right-sidebar", true)
  );

  const toggleLeft = useCallback(() => {
    setLeftOpen((prev) => {
      localStorage.setItem("pr-zen:left-sidebar", String(!prev));
      return !prev;
    });
  }, []);

  const toggleRight = useCallback(() => {
    setRightOpen((prev) => {
      localStorage.setItem("pr-zen:right-sidebar", String(!prev));
      return !prev;
    });
  }, []);

  return { leftOpen, rightOpen, toggleLeft, toggleRight };
}
```

- [ ] **Step 2: Write useReviewProgress.ts**

```typescript
import { useState, useCallback } from "react";

interface ReviewProgress {
  reviewed: Set<string>;
  toggleReviewed: (path: string) => void;
  isReviewed: (path: string) => boolean;
  reviewedCount: number;
}

function getStorageKey(prUrl?: string): string {
  return `pr-zen:reviewed:${prUrl ?? "unknown"}`;
}

function loadReviewed(prUrl?: string): Set<string> {
  try {
    const raw = localStorage.getItem(getStorageKey(prUrl));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveReviewed(reviewed: Set<string>, prUrl?: string) {
  try {
    localStorage.setItem(
      getStorageKey(prUrl),
      JSON.stringify([...reviewed])
    );
  } catch {
    // localStorage full or unavailable
  }
}

export function useReviewProgress(prUrl?: string): ReviewProgress {
  const [reviewed, setReviewed] = useState(() => loadReviewed(prUrl));

  const toggleReviewed = useCallback(
    (path: string) => {
      setReviewed((prev) => {
        const next = new Set(prev);
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
        }
        saveReviewed(next, prUrl);
        return next;
      });
    },
    [prUrl]
  );

  const isReviewed = useCallback(
    (path: string) => reviewed.has(path),
    [reviewed]
  );

  return { reviewed, toggleReviewed, isReviewed, reviewedCount: reviewed.size };
}
```

- [ ] **Step 3: Write useFileOrder.ts**

```typescript
import { useState, useCallback, useMemo } from "react";
import type { PRFile } from "../lib/api";

type OrderingMode = "bottom-up" | "top-down";

interface FileOrderState {
  mode: OrderingMode;
  toggleMode: () => void;
  orderedFiles: PRFile[];
}

function loadMode(): OrderingMode {
  try {
    const val = localStorage.getItem("pr-zen:ordering-mode");
    return val === "top-down" ? "top-down" : "bottom-up";
  } catch {
    return "bottom-up";
  }
}

export function useFileOrder(
  files: PRFile[],
  fileOrder: string[]
): FileOrderState {
  const [mode, setMode] = useState<OrderingMode>(loadMode);

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next = prev === "bottom-up" ? "top-down" : "bottom-up";
      localStorage.setItem("pr-zen:ordering-mode", next);
      return next;
    });
  }, []);

  const orderedFiles = useMemo(() => {
    const fileMap = new Map(files.map((f) => [f.path, f]));
    const baseOrder = fileOrder.length > 0 ? fileOrder : files.map((f) => f.path);
    const order = mode === "top-down" ? [...baseOrder].reverse() : baseOrder;
    return order
      .map((path) => fileMap.get(path))
      .filter((f): f is PRFile => f !== undefined);
  }, [files, fileOrder, mode]);

  return { mode, toggleMode, orderedFiles };
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/hooks/
git commit -m "feat: add sidebar state, review progress, and file order hooks"
```

### Task 2.5: File Tree Component

**Files:**
- Create: `packages/web/src/components/FileTree.tsx`

- [ ] **Step 1: Write FileTree.tsx**

```tsx
import type { PRFile } from "../lib/api";

interface FileTreeProps {
  files: PRFile[];
  currentFile: string | null;
  isReviewed: (path: string) => boolean;
  onToggleReviewed: (path: string) => void;
  onFileClick: (path: string) => void;
  mode: "bottom-up" | "top-down";
  onToggleMode: () => void;
}

const statusColors: Record<string, string> = {
  added: "text-zen-add-text",
  modified: "text-zen-accent",
  removed: "text-zen-del-text",
  renamed: "text-yellow-400",
};

const statusIcons: Record<string, string> = {
  added: "A",
  modified: "M",
  removed: "D",
  renamed: "R",
};

export function FileTree({
  files,
  currentFile,
  isReviewed,
  onToggleReviewed,
  onFileClick,
  mode,
  onToggleMode,
}: FileTreeProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zen-border">
        <span className="text-xs font-medium text-zen-muted uppercase tracking-wide">
          Files
        </span>
        <button
          onClick={onToggleMode}
          className="text-xs text-zen-muted hover:text-zen-text transition-colors"
          title={`Switch to ${mode === "bottom-up" ? "top-down" : "bottom-up"}`}
        >
          {mode === "bottom-up" ? "↑ bottom-up" : "↓ top-down"}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {files.map((file) => {
          const fileName = file.path.split("/").pop() ?? file.path;
          const dirPath = file.path.includes("/")
            ? file.path.slice(0, file.path.lastIndexOf("/"))
            : "";
          const reviewed = isReviewed(file.path);
          const isCurrent = file.path === currentFile;

          return (
            <div
              key={file.path}
              className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm group transition-colors ${
                isCurrent
                  ? "bg-zen-accent/10 text-zen-text"
                  : "text-zen-muted hover:bg-zen-surface hover:text-zen-text"
              }`}
              onClick={() => onFileClick(file.path)}
            >
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleReviewed(file.path);
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-3.5 w-3.5 rounded border-zen-border accent-zen-accent shrink-0"
              />
              <span
                className={`text-xs font-mono shrink-0 ${statusColors[file.status] ?? "text-zen-muted"}`}
              >
                {statusIcons[file.status] ?? "?"}
              </span>
              <div className="min-w-0 flex-1">
                <span className={`block truncate ${reviewed ? "line-through opacity-50" : ""}`}>
                  {fileName}
                </span>
                {dirPath && (
                  <span className="block truncate text-xs text-zen-muted/60">
                    {dirPath}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/FileTree.tsx
git commit -m "feat: add file tree component with review checkboxes"
```

### Task 2.6: Context Panel (PR, Chat, Commits Tabs)

**Files:**
- Create: `packages/web/src/components/ContextPanel.tsx`
- Create: `packages/web/src/components/PRTab.tsx`
- Create: `packages/web/src/components/ChatTab.tsx`
- Create: `packages/web/src/components/CommitsTab.tsx`

- [ ] **Step 1: Write PRTab.tsx**

```tsx
import type { PRMetadata } from "../lib/api";

interface PRTabProps {
  pr: PRMetadata;
}

export function PRTab({ pr }: PRTabProps) {
  const stateBadgeColor =
    pr.state === "merged"
      ? "bg-purple-500/20 text-purple-400"
      : pr.state === "open"
        ? "bg-zen-add-text/20 text-zen-add-text"
        : "bg-zen-del-text/20 text-zen-del-text";

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-zen-text leading-tight">
          {pr.title}
        </h2>
        <div className="flex items-center gap-2 mt-2">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${stateBadgeColor}`}
          >
            {pr.state}
          </span>
          <span className="text-xs text-zen-muted">
            {pr.author.login}
          </span>
        </div>
      </div>

      <div className="text-xs text-zen-muted space-y-1">
        <div>
          <span className="text-zen-muted/60">base:</span> {pr.branch.base}
        </div>
        <div>
          <span className="text-zen-muted/60">head:</span> {pr.branch.head}
        </div>
      </div>

      {pr.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {pr.labels.map((label) => (
            <span
              key={label}
              className="text-xs px-2 py-0.5 rounded-full bg-zen-border text-zen-muted"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {pr.body && (
        <div className="pt-2 border-t border-zen-border">
          <div className="text-sm text-zen-text/80 whitespace-pre-wrap break-words">
            {pr.body}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write ChatTab.tsx**

```tsx
import { useState, type FormEvent } from "react";
import type { PRComment } from "../lib/api";

interface ChatTabProps {
  comments: PRComment[];
  onPostComment: (body: string) => Promise<void>;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function ChatTab({ comments, onPostComment }: ChatTabProps) {
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  const prComments = comments.filter((c) => c.type === "pr");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() || posting) return;
    setPosting(true);
    try {
      await onPostComment(body.trim());
      setBody("");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {prComments.length === 0 && (
          <p className="text-sm text-zen-muted text-center py-4">
            No comments yet.
          </p>
        )}
        {prComments.map((comment) => (
          <div key={comment.id} className="space-y-1">
            <div className="flex items-center gap-2">
              <img
                src={comment.author.avatarUrl}
                alt={comment.author.login}
                className="w-5 h-5 rounded-full"
              />
              <span className="text-xs font-medium text-zen-text">
                {comment.author.login}
              </span>
              <span className="text-xs text-zen-muted">
                {formatTime(comment.createdAt)}
              </span>
            </div>
            <div className="text-sm text-zen-text/80 whitespace-pre-wrap break-words pl-7">
              {comment.body}
            </div>
          </div>
        ))}
      </div>
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-zen-border"
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Leave a comment..."
          rows={3}
          className="w-full bg-zen-bg border border-zen-border rounded-md px-3 py-2 text-sm text-zen-text placeholder:text-zen-muted/50 resize-none focus:outline-none focus:border-zen-accent"
        />
        <div className="flex justify-end mt-2">
          <button
            type="submit"
            disabled={!body.trim() || posting}
            className="px-3 py-1.5 text-xs font-medium bg-zen-accent text-white rounded-md disabled:opacity-40 hover:bg-zen-accent/80 transition-colors"
          >
            {posting ? "Posting..." : "Comment"}
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Write CommitsTab.tsx**

```tsx
import type { PRCommit } from "../lib/api";

interface CommitsTabProps {
  commits: PRCommit[];
  activeCommit: string | null;
  onSelectCommit: (sha: string | null) => void;
}

export function CommitsTab({
  commits,
  activeCommit,
  onSelectCommit,
}: CommitsTabProps) {
  return (
    <div className="p-3 space-y-1">
      {activeCommit && (
        <button
          onClick={() => onSelectCommit(null)}
          className="w-full text-left text-xs text-zen-accent hover:text-zen-accent/80 mb-2 transition-colors"
        >
          ← All changes
        </button>
      )}
      {commits.map((commit) => {
        const shortSha = commit.sha.slice(0, 7);
        const firstLine = commit.message.split("\n")[0];
        const isActive = commit.sha === activeCommit;

        return (
          <button
            key={commit.sha}
            onClick={() => onSelectCommit(commit.sha)}
            className={`w-full text-left p-2 rounded-md transition-colors ${
              isActive
                ? "bg-zen-accent/10 text-zen-text"
                : "hover:bg-zen-surface text-zen-muted hover:text-zen-text"
            }`}
          >
            <div className="flex items-center gap-2">
              <code className="text-xs text-zen-accent shrink-0">
                {shortSha}
              </code>
              <span className="text-xs truncate">{firstLine}</span>
            </div>
            <div className="text-xs text-zen-muted/60 mt-0.5 pl-[4.5rem]">
              {commit.author.login}
            </div>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Write ContextPanel.tsx**

```tsx
import { useState } from "react";
import { PRTab } from "./PRTab";
import { ChatTab } from "./ChatTab";
import { CommitsTab } from "./CommitsTab";
import type { PRPayload, PRComment, PRCommit, PRMetadata } from "../lib/api";

interface ContextPanelProps {
  pr: PRMetadata;
  comments: PRComment[];
  commits: PRCommit[];
  activeCommit: string | null;
  onSelectCommit: (sha: string | null) => void;
  onPostComment: (body: string) => Promise<void>;
}

type Tab = "pr" | "chat" | "commits";

export function ContextPanel({
  pr,
  comments,
  commits,
  activeCommit,
  onSelectCommit,
  onPostComment,
}: ContextPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("pr");

  const tabs: { id: Tab; label: string }[] = [
    { id: "pr", label: "PR" },
    { id: "chat", label: "Chat" },
    { id: "commits", label: "Commits" },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b border-zen-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-xs font-medium text-center transition-colors ${
              activeTab === tab.id
                ? "text-zen-accent border-b-2 border-zen-accent"
                : "text-zen-muted hover:text-zen-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {activeTab === "pr" && <PRTab pr={pr} />}
        {activeTab === "chat" && (
          <ChatTab comments={comments} onPostComment={onPostComment} />
        )}
        {activeTab === "commits" && (
          <CommitsTab
            commits={commits}
            activeCommit={activeCommit}
            onSelectCommit={onSelectCommit}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/ContextPanel.tsx packages/web/src/components/PRTab.tsx packages/web/src/components/ChatTab.tsx packages/web/src/components/CommitsTab.tsx
git commit -m "feat: add context panel with PR, Chat, and Commits tabs"
```

### Task 2.7: Progress Bar & Bottom Bar

**Files:**
- Create: `packages/web/src/components/ProgressBar.tsx`
- Create: `packages/web/src/components/BottomBar.tsx`

- [ ] **Step 1: Write ProgressBar.tsx**

```tsx
import { useState } from "react";

interface ProgressBarProps {
  reviewedCount: number;
  totalFiles: number;
}

export function ProgressBar({ reviewedCount, totalFiles }: ProgressBarProps) {
  const [hovering, setHovering] = useState(false);
  const pct = totalFiles > 0 ? (reviewedCount / totalFiles) * 100 : 0;

  return (
    <div
      className="h-1 w-full bg-zen-surface relative cursor-pointer"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div
        className="h-full bg-zen-accent transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
      {hovering && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 bg-zen-surface border border-zen-border rounded text-xs text-zen-text whitespace-nowrap z-50">
          {reviewedCount}/{totalFiles} files — {Math.round(pct)}%
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write BottomBar.tsx**

```tsx
import { useState } from "react";

interface BottomBarProps {
  onSubmitReview: (
    event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
    body?: string
  ) => Promise<void>;
}

export function BottomBar({ onSubmitReview }: BottomBarProps) {
  const [action, setAction] = useState<
    "APPROVE" | "REQUEST_CHANGES" | "COMMENT"
  >("APPROVE");
  const [submitting, setSubmitting] = useState(false);

  const actions: {
    value: "APPROVE" | "REQUEST_CHANGES" | "COMMENT";
    label: string;
  }[] = [
    { value: "APPROVE", label: "Approve" },
    { value: "REQUEST_CHANGES", label: "Request Changes" },
    { value: "COMMENT", label: "Comment" },
  ];

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmitReview(action);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-zen-border bg-zen-surface">
      <span className="text-xs text-zen-muted">
        <kbd className="px-1.5 py-0.5 bg-zen-bg border border-zen-border rounded text-[10px]">
          Cmd+K
        </kbd>{" "}
        Command Palette
      </span>
      <div className="flex items-center gap-2">
        <select
          value={action}
          onChange={(e) =>
            setAction(
              e.target.value as "APPROVE" | "REQUEST_CHANGES" | "COMMENT"
            )
          }
          className="bg-zen-bg border border-zen-border rounded-md px-2 py-1.5 text-xs text-zen-text focus:outline-none focus:border-zen-accent"
        >
          {actions.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-3 py-1.5 text-xs font-medium bg-zen-accent text-white rounded-md disabled:opacity-40 hover:bg-zen-accent/80 transition-colors"
        >
          {submitting ? "Submitting..." : "Submit Review"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/ProgressBar.tsx packages/web/src/components/BottomBar.tsx
git commit -m "feat: add progress bar and bottom bar components"
```

### Task 2.8: App Shell — Three-Panel Layout

**Files:**
- Create: `packages/web/src/App.tsx`

- [ ] **Step 1: Write App.tsx — root layout with three panels**

```tsx
import { PRProvider, usePRContext } from "./context/PRContext";
import { FileTree } from "./components/FileTree";
import { ContextPanel } from "./components/ContextPanel";
import { ProgressBar } from "./components/ProgressBar";
import { BottomBar } from "./components/BottomBar";
import { useSidebarState } from "./hooks/useSidebarState";
import { useReviewProgress } from "./hooks/useReviewProgress";
import { useFileOrder } from "./hooks/useFileOrder";
import { useState, useCallback } from "react";
import { api } from "./lib/api";

function AppContent() {
  const { data, loading, error, currentFiles, currentFileOrder, activeCommit, setActiveCommit, addComment } =
    usePRContext();
  const { leftOpen, rightOpen, toggleLeft, toggleRight } = useSidebarState();
  const { mode, toggleMode, orderedFiles } = useFileOrder(
    currentFiles,
    currentFileOrder
  );
  const prKey = data
    ? `${data.pr.number}`
    : undefined;
  const { isReviewed, toggleReviewed, reviewedCount } =
    useReviewProgress(prKey);
  const [currentFile, setCurrentFile] = useState<string | null>(null);

  const handlePostComment = useCallback(
    async (body: string) => {
      const comment = await api.postComment(body);
      addComment(comment);
    },
    [addComment]
  );

  const handleSubmitReview = useCallback(
    async (
      event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
      body?: string
    ) => {
      await api.submitReview(event, body);
    },
    []
  );

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-zen-muted text-sm">Loading PR...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-zen-del-text text-sm">
          {error ?? "Failed to load PR"}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <ProgressBar
        reviewedCount={reviewedCount}
        totalFiles={orderedFiles.length}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        {leftOpen && (
          <div className="w-64 shrink-0 border-r border-zen-border bg-zen-surface overflow-hidden">
            <FileTree
              files={orderedFiles}
              currentFile={currentFile}
              isReviewed={isReviewed}
              onToggleReviewed={toggleReviewed}
              onFileClick={setCurrentFile}
              mode={mode}
              onToggleMode={toggleMode}
            />
          </div>
        )}

        {/* Sidebar edge indicator */}
        {!leftOpen && (
          <div
            onClick={toggleLeft}
            className="w-1 bg-zen-border hover:bg-zen-accent cursor-pointer transition-colors shrink-0"
            title="Show file tree (Cmd+[)"
          />
        )}

        {/* Center — Diff View */}
        <div className="flex-1 overflow-auto">
          {activeCommit && (
            <div className="sticky top-0 z-10 px-4 py-2 bg-zen-surface border-b border-zen-border">
              <button
                onClick={() => setActiveCommit(null)}
                className="text-xs text-zen-accent hover:text-zen-accent/80"
              >
                ← Back to full diff
              </button>
              <span className="text-xs text-zen-muted ml-2">
                Viewing commit {activeCommit.slice(0, 7)}
              </span>
            </div>
          )}
          <div className="p-4 text-zen-muted text-sm text-center">
            Diff view will be implemented in Phase 3
          </div>
        </div>

        {/* Right Sidebar */}
        {rightOpen && (
          <div className="w-80 shrink-0 border-l border-zen-border bg-zen-surface overflow-hidden">
            <ContextPanel
              pr={data.pr}
              comments={data.comments}
              commits={data.commits}
              activeCommit={activeCommit}
              onSelectCommit={setActiveCommit}
              onPostComment={handlePostComment}
            />
          </div>
        )}

        {/* Sidebar edge indicator */}
        {!rightOpen && (
          <div
            onClick={toggleRight}
            className="w-1 bg-zen-border hover:bg-zen-accent cursor-pointer transition-colors shrink-0"
            title="Show context panel (Cmd+])"
          />
        )}
      </div>

      <BottomBar onSubmitReview={handleSubmitReview} />
    </div>
  );
}

export function App() {
  return (
    <PRProvider>
      <AppContent />
    </PRProvider>
  );
}
```

- [ ] **Step 2: Verify the web package builds**

```bash
cd packages/web && bun run build
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/App.tsx
git commit -m "feat: add three-panel app shell with layout and all panels wired"
```

---

## Phase 3: Diff View with @pierre/diffs

### Task 3.1: DiffView Component

**Files:**
- Create: `packages/web/src/components/DiffView.tsx`

Key API notes for `@pierre/diffs`:
- `PatchDiff` renders from a patch string directly
- `parsePatchFiles` parses a unified diff patch into `FileDiffMetadata[]`
- `FileDiff` renders pre-parsed `FileDiffMetadata`
- `lineAnnotations` prop accepts `DiffLineAnnotation[]` with `{ side, lineNumber, metadata }`
- `renderAnnotation` renders annotation content
- `enableGutterUtility` + `onGutterUtilityClick` adds a "+" button on line hover
- `enableLineSelection` + `onLineSelectionEnd` for range selection
- React `Virtualizer` wraps components for virtualized scrolling

- [ ] **Step 1: Write DiffView.tsx**

```tsx
import { useRef, useCallback, useMemo } from "react";
import {
  PatchDiff,
  Virtualizer,
  type DiffLineAnnotation,
  type SelectedLineRange,
} from "@pierre/diffs/react";
import type { PRFile, PRComment } from "../lib/api";

interface DiffViewProps {
  files: PRFile[];
  comments: PRComment[];
  onStartComment: (params: {
    path: string;
    line: number;
    side: "LEFT" | "RIGHT";
  }) => void;
  currentFileRef?: (path: string, el: HTMLDivElement | null) => void;
}

interface CommentThreadProps {
  comments: PRComment[];
  onReply: (commentId: number, body: string) => Promise<void>;
}

function CommentThread({ comments, onReply }: CommentThreadProps) {
  const [replyBody, setReplyBody] = useState("");
  const [replying, setReplying] = useState(false);
  const rootComment = comments[0];

  async function handleReply() {
    if (!replyBody.trim() || replying) return;
    setReplying(true);
    try {
      await onReply(rootComment.id, replyBody.trim());
      setReplyBody("");
    } finally {
      setReplying(false);
    }
  }

  return (
    <div className="border border-zen-border rounded-md bg-zen-bg my-1 mx-2 overflow-hidden">
      {comments.map((c) => (
        <div key={c.id} className="px-3 py-2 border-b border-zen-border last:border-b-0">
          <div className="flex items-center gap-2 mb-1">
            <img src={c.author.avatarUrl} className="w-4 h-4 rounded-full" alt="" />
            <span className="text-xs font-medium text-zen-text">{c.author.login}</span>
          </div>
          <div className="text-xs text-zen-text/80 whitespace-pre-wrap">{c.body}</div>
        </div>
      ))}
      <div className="px-3 py-2 flex gap-2">
        <input
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          placeholder="Reply..."
          className="flex-1 bg-zen-surface border border-zen-border rounded px-2 py-1 text-xs text-zen-text placeholder:text-zen-muted/50 focus:outline-none focus:border-zen-accent"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleReply();
            }
          }}
        />
        <button
          onClick={handleReply}
          disabled={!replyBody.trim() || replying}
          className="px-2 py-1 text-xs bg-zen-accent text-white rounded disabled:opacity-40"
        >
          Reply
        </button>
      </div>
    </div>
  );
}

import { useState } from "react";

export function DiffView({
  files,
  comments,
  onStartComment,
  currentFileRef,
}: DiffViewProps) {
  // Group inline comments by file path and line
  const commentsByFile = useMemo(() => {
    const map = new Map<string, PRComment[]>();
    for (const c of comments) {
      if (c.type !== "inline" || !c.path) continue;
      const existing = map.get(c.path) ?? [];
      existing.push(c);
      map.set(c.path, existing);
    }
    return map;
  }, [comments]);

  return (
    <Virtualizer
      className="h-full overflow-auto"
      contentClassName="space-y-2 p-4"
      config={{
        overscrollSize: 1000,
        intersectionObserverMargin: 2000,
      }}
    >
      {files.map((file) => {
        const fileComments = commentsByFile.get(file.path) ?? [];

        // Build annotation threads grouped by line
        const threadMap = new Map<string, PRComment[]>();
        for (const c of fileComments) {
          if (!c.line) continue;
          const key = `${c.line}:${c.side ?? "RIGHT"}`;
          const thread = threadMap.get(key) ?? [];
          // Group replies with their parent
          if (c.inReplyToId) {
            // Find parent thread
            for (const [k, t] of threadMap) {
              if (t.some((tc) => tc.id === c.inReplyToId)) {
                t.push(c);
                break;
              }
            }
          } else {
            thread.push(c);
            threadMap.set(key, thread);
          }
        }

        const annotations: DiffLineAnnotation<{
          thread: PRComment[];
        }>[] = [];
        for (const [key, thread] of threadMap) {
          const [lineStr, side] = key.split(":");
          annotations.push({
            lineNumber: parseInt(lineStr, 10),
            side: side === "LEFT" ? "deletions" : "additions",
            metadata: { thread },
          });
        }

        return (
          <div
            key={file.path}
            ref={(el) => currentFileRef?.(file.path, el)}
            data-file-path={file.path}
          >
            <PatchDiff
              patch={file.patch}
              options={{
                theme: "pierre-dark",
                diffStyle: "unified",
                diffIndicators: "bars",
                hunkSeparators: "line-info-basic",
                expandUnchanged: true,
                lineHoverHighlight: "both",
                enableGutterUtility: true,
                overflow: "scroll",
              }}
              lineAnnotations={annotations}
              renderAnnotation={(ann) => (
                <CommentThread
                  comments={ann.metadata.thread}
                  onReply={async () => {
                    /* wired in Phase 4 */
                  }}
                />
              )}
              renderHeaderPrefix={() => (
                <div className="flex items-center gap-2 px-3 py-1.5">
                  <span className="text-xs font-mono text-zen-text">
                    {file.path}
                  </span>
                  {file.previousPath && (
                    <span className="text-xs text-zen-muted">
                      ← {file.previousPath}
                    </span>
                  )}
                </div>
              )}
              onGutterUtilityClick={(range) => {
                onStartComment({
                  path: file.path,
                  line: range.start,
                  side: "RIGHT",
                });
              }}
            />
          </div>
        );
      })}
    </Virtualizer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/DiffView.tsx
git commit -m "feat: add DiffView component with @pierre/diffs, annotations, and gutter utility"
```

### Task 3.2: Wire DiffView into App

**Files:**
- Modify: `packages/web/src/App.tsx`

- [ ] **Step 1: Replace the placeholder diff area in App.tsx with DiffView**

Replace the center panel placeholder:
```tsx
<div className="p-4 text-zen-muted text-sm text-center">
  Diff view will be implemented in Phase 3
</div>
```

With:
```tsx
<DiffView
  files={orderedFiles}
  comments={data.comments}
  onStartComment={handleStartComment}
  currentFileRef={handleFileRef}
/>
```

Add to imports:
```tsx
import { DiffView } from "./components/DiffView";
```

Add handlers in AppContent before the return:
```tsx
const fileRefs = useRef<Map<string, HTMLDivElement>>(new Map());

const handleFileRef = useCallback((path: string, el: HTMLDivElement | null) => {
  if (el) {
    fileRefs.current.set(path, el);
  } else {
    fileRefs.current.delete(path);
  }
}, []);

const handleStartComment = useCallback(
  (params: { path: string; line: number; side: "LEFT" | "RIGHT" }) => {
    // Comment creation UI will be implemented in Phase 4
    console.log("Start comment:", params);
  },
  []
);

// Update setCurrentFile to scroll to the file
const handleFileClick = useCallback((path: string) => {
  setCurrentFile(path);
  const el = fileRefs.current.get(path);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}, []);
```

Update the FileTree `onFileClick` prop to use `handleFileClick` instead of `setCurrentFile`.

Add `useRef` to the react import.

- [ ] **Step 2: Verify build**

```bash
cd packages/web && bun run build
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/App.tsx
git commit -m "feat: wire DiffView into app shell with file navigation"
```

---

## Phase 4: Interactive Features & Polish

### Task 4.1: Inline Comment Creation

**Files:**
- Create: `packages/web/src/components/InlineCommentForm.tsx`
- Modify: `packages/web/src/components/DiffView.tsx`

- [ ] **Step 1: Write InlineCommentForm.tsx**

```tsx
import { useState, useRef, useEffect, type FormEvent } from "react";

interface InlineCommentFormProps {
  path: string;
  line: number;
  side: string;
  onSubmit: (params: {
    body: string;
    path: string;
    line: number;
    side: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export function InlineCommentForm({
  path,
  line,
  side,
  onSubmit,
  onCancel,
}: InlineCommentFormProps) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ body: body.trim(), path, line, side });
      onCancel();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-zen-border rounded-md bg-zen-bg my-1 mx-2 p-3"
    >
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a comment..."
        rows={3}
        className="w-full bg-zen-surface border border-zen-border rounded px-3 py-2 text-xs text-zen-text placeholder:text-zen-muted/50 resize-none focus:outline-none focus:border-zen-accent"
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.metaKey) {
            e.preventDefault();
            handleSubmit(e);
          }
          if (e.key === "Escape") {
            onCancel();
          }
        }}
      />
      <div className="flex justify-end gap-2 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-2 py-1 text-xs text-zen-muted hover:text-zen-text transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!body.trim() || submitting}
          className="px-3 py-1 text-xs bg-zen-accent text-white rounded disabled:opacity-40"
        >
          {submitting ? "Posting..." : "Comment"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Update DiffView to support inline comment creation**

Add a `pendingComment` state and `onSubmitInlineComment` prop. When `onStartComment` fires, show the `InlineCommentForm` as an annotation on that line. Wire the CommentThread reply handler.

- [ ] **Step 3: Wire comment submission through App.tsx**

Connect `api.postInlineComment` and `api.replyToComment` through the context.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/InlineCommentForm.tsx packages/web/src/components/DiffView.tsx packages/web/src/App.tsx
git commit -m "feat: add inline comment creation and reply functionality"
```

### Task 4.2: Keyboard Shortcuts

**Files:**
- Create: `packages/web/src/hooks/useKeyboard.ts`
- Modify: `packages/web/src/App.tsx`

- [ ] **Step 1: Write useKeyboard.ts**

```typescript
import { useEffect, useCallback } from "react";

interface KeyboardActions {
  nextFile: () => void;
  prevFile: () => void;
  markReviewed: () => void;
  startComment: () => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  openCommandPalette: () => void;
  submitReview: () => void;
  showHelp: () => void;
}

export function useKeyboard(actions: KeyboardActions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const meta = e.metaKey || e.ctrlKey;

      if (e.key === "j") {
        e.preventDefault();
        actions.nextFile();
      } else if (e.key === "k") {
        e.preventDefault();
        actions.prevFile();
      } else if (e.key === "x") {
        e.preventDefault();
        actions.markReviewed();
      } else if (e.key === "c") {
        e.preventDefault();
        actions.startComment();
      } else if (meta && e.key === "[") {
        e.preventDefault();
        actions.toggleLeftSidebar();
      } else if (meta && e.key === "]") {
        e.preventDefault();
        actions.toggleRightSidebar();
      } else if (meta && e.key === "k") {
        e.preventDefault();
        actions.openCommandPalette();
      } else if (meta && e.key === "Enter") {
        e.preventDefault();
        actions.submitReview();
      } else if (e.key === "?" && !meta) {
        e.preventDefault();
        actions.showHelp();
      } else if (e.key === "Escape") {
        // Handled locally by modals/overlays
      }
    },
    [actions]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
```

- [ ] **Step 2: Wire keyboard shortcuts in App.tsx**

Import `useKeyboard` and connect it to navigation state (file index tracking, sidebar toggles, etc.).

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/hooks/useKeyboard.ts packages/web/src/App.tsx
git commit -m "feat: add keyboard shortcuts for file navigation and actions"
```

### Task 4.3: Command Palette

**Files:**
- Create: `packages/web/src/components/CommandPalette.tsx`
- Modify: `packages/web/src/App.tsx`

- [ ] **Step 1: Write CommandPalette.tsx**

```tsx
import { useState, useEffect, useRef, useMemo } from "react";
import type { PRFile } from "../lib/api";

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  files: PRFile[];
  onFileSelect: (path: string) => void;
  commands: Command[];
}

export function CommandPalette({
  open,
  onClose,
  files,
  onFileSelect,
  commands,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const allItems = useMemo(() => {
    const fileItems: Command[] = files.map((f) => ({
      id: `file:${f.path}`,
      label: f.path,
      action: () => {
        onFileSelect(f.path);
        onClose();
      },
    }));
    return [...commands, ...fileItems];
  }, [files, commands, onFileSelect, onClose]);

  const filtered = useMemo(() => {
    if (!query) return allItems;
    const lower = query.toLowerCase();
    return allItems.filter((item) => item.label.toLowerCase().includes(lower));
  }, [allItems, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!open) return null;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-[500px] bg-zen-surface border border-zen-border rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search files and commands..."
          className="w-full px-4 py-3 bg-transparent text-sm text-zen-text placeholder:text-zen-muted/50 border-b border-zen-border focus:outline-none"
        />
        <div className="max-h-[300px] overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="px-4 py-3 text-sm text-zen-muted">
              No results found.
            </div>
          )}
          {filtered.map((item, i) => (
            <button
              key={item.id}
              onClick={item.action}
              className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between transition-colors ${
                i === selectedIndex
                  ? "bg-zen-accent/10 text-zen-text"
                  : "text-zen-muted hover:bg-zen-surface"
              }`}
            >
              <span className="truncate">{item.label}</span>
              {item.shortcut && (
                <kbd className="ml-2 text-xs text-zen-muted/60 shrink-0">
                  {item.shortcut}
                </kbd>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire CommandPalette into App.tsx**

Add `commandPaletteOpen` state, connect to keyboard shortcut, provide file list and commands.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/CommandPalette.tsx packages/web/src/App.tsx
git commit -m "feat: add command palette with file search and actions"
```

### Task 4.4: Shortcuts Help Overlay

**Files:**
- Create: `packages/web/src/components/ShortcutsHelp.tsx`
- Modify: `packages/web/src/App.tsx`

- [ ] **Step 1: Write ShortcutsHelp.tsx**

```tsx
interface ShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  { key: "j / k", description: "Next / previous file" },
  { key: "x", description: "Mark current file reviewed" },
  { key: "c", description: "Comment on current hunk" },
  { key: "Cmd+K", description: "Command palette" },
  { key: "Cmd+[", description: "Toggle left sidebar" },
  { key: "Cmd+]", description: "Toggle right sidebar" },
  { key: "Cmd+Enter", description: "Submit review" },
  { key: "Esc", description: "Close overlay / cancel" },
  { key: "?", description: "Show this help" },
];

export function ShortcutsHelp({ open, onClose }: ShortcutsHelpProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-[400px] bg-zen-surface border border-zen-border rounded-lg shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold text-zen-text mb-4">
          Keyboard Shortcuts
        </h2>
        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between">
              <span className="text-sm text-zen-muted">{s.description}</span>
              <kbd className="px-2 py-0.5 bg-zen-bg border border-zen-border rounded text-xs text-zen-text">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          <button
            onClick={onClose}
            className="text-xs text-zen-muted hover:text-zen-text"
          >
            Press Esc to close
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into App.tsx**

Add `showHelp` state, connect to keyboard shortcut and render `ShortcutsHelp`.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/ShortcutsHelp.tsx packages/web/src/App.tsx
git commit -m "feat: add keyboard shortcuts help overlay"
```

### Task 4.5: Final Wiring & Polish

**Files:**
- Modify: `packages/web/src/App.tsx`
- Modify: `packages/web/src/components/DiffView.tsx`

- [ ] **Step 1: Wire all interactive features together in App.tsx**

- Connect inline comment submission through `api.postInlineComment` and `addComment`
- Connect reply through `api.replyToComment` and `addComment`
- Track current file index for j/k navigation
- Use IntersectionObserver on file divs to auto-update currentFile on scroll
- Ensure Zen mode works (both sidebars collapsed = diff fills screen)

- [ ] **Step 2: Pass reply handler through DiffView**

Update DiffView to accept and use `onReplyToComment` prop, wiring it to the CommentThread components.

- [ ] **Step 3: Verify complete build**

```bash
cd packages/web && bun run build
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/
git commit -m "feat: wire all interactive features — comments, replies, navigation, zen mode"
```

- [ ] **Step 5: Final integration test**

```bash
# From repo root
bun install
cd packages/web && bun run build
cd ../cli && bun run src/index.ts --help
```

- [ ] **Step 6: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final integration fixes and polish"
```
