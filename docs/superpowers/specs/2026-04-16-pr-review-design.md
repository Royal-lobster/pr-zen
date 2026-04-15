# PR Review Tool — Design Spec

A lightweight, local-first code review tool that provides a minimal, zen-like reading experience for GitHub PRs with dependency-ordered file navigation.

## Problem

GitHub's PR review UI has too much noise (CI checks, labels, merge buttons, file tree clutter), presents files in arbitrary order, loses PR context while deep in diffs, and makes AI-assisted review clunky. No existing tool solves all of these. Dependency-ordered file viewing in particular is a complete white space — no tool offers it.

## Solution

A CLI that fetches PR data via the GitHub API, runs dependency analysis on local source files, and serves a minimal three-panel web UI on localhost.

```
pr-review <pr-number> [--repo owner/repo]
```

Reads the `gh` CLI auth token. No OAuth, no deployment, no accounts.

## Architecture

```
pr-review 1234
    |
    +-- 1. Read gh auth token
    +-- 2. Fetch PR metadata via GitHub API (title, description, diff, comments)
    +-- 3. Use existing local checkout (or checkout PR branch)
    +-- 4. Run madge on changed JS/TS files against local source tree
    +-- 5. Topological sort -> file review order
    +-- 6. Serve localhost -> open browser
```

Three pieces:

1. **CLI** (Bun) — fetches data, runs dependency analysis, serves the app
2. **Web UI** (React + Vite) — renders diffs, sidebars, comments, progress
3. **GitHub API bridge** — CLI proxies API calls so the browser never holds tokens

The browser talks to localhost. The CLI talks to GitHub. No tokens in the browser.

**Live updates:** CLI polls GitHub for new comments every ~30s. Posting a comment or review pushes to GitHub API immediately.

## UI Layout

Three-panel layout: file tree (left), diff (center), context (right).

```
+----------------------------------------------------------------------+
| ========================------------------- 3/7  43%                  |
+-------------+------------------------------+-------------------------+
|             |                              |                         |
| FILE TREE   |       DIFF VIEW              |  CONTEXT PANEL          |
|             |                              |                         |
| ^ bottom-up |                              | +----+----+-----+      |
|             |                              | | PR |Chat|Cmts |      |
| x helpers   |   hooks/useAuth.ts           | +----+----+-----+      |
| x types     |                              |                         |
| * useAuth   |   14 - if (!user) return     |  fix: auth redirect     |
| o api       |   15 + if (!user) {          |  on expired token       |
| o LoginPage |   16 +   clearToken()        |                         |
| o App.tsx   |   17 +   return redirect()   |  When a user's token    |
|             |   18 + }                      |  expires during a       |
|             |                              |  session the app...     |
|             |                              |                         |
+-------------+------------------------------+-------------------------+
|                                                       Approve v  CK  |
+----------------------------------------------------------------------+
```

### Left Sidebar — File Tree (collapsible: Cmd+[)

- Dependency-ordered file list for JS/TS (via madge + toposort)
- GitHub's default order for all other languages
- Toggle between bottom-up and top-down ordering
- Checkboxes for marking files as reviewed
- Current file highlighted as you scroll (Intersection Observer)
- Click to jump to that file in the diff view

### Center — Diff View

- Powered by `@pierre/diffs`
- All files in one continuous scroll, virtualized at the file level via `@tanstack/virtual`
- Unified diff by default, side-by-side toggle available
- Sticky file headers on scroll
- Inline comments via `@pierre/diffs` annotations and thread system
- Resolve buttons on comment threads (built into `@pierre/diffs`)
- Line selection for creating new comments (`enableLineSelection`)

### Right Sidebar — Context Panel (collapsible: Cmd+])

Three tabs:

| Tab | Content |
|---|---|
| **PR** | Title, description (rendered markdown), labels, author, branch info |
| **Chat** | Full PR comment thread. Post new comments here. `@claude` questions are just comments. |
| **Commits** | Commit list. Click a commit to show only that commit's diff. Click "All changes" to return to full PR view. |

### Bottom Bar

- Review action dropdown: Approve / Request Changes / Comment
- Cmd+K hint for command palette

### Zen Mode

Both sidebars collapsed. Diff fills the screen. Thin progress bar at top. Edge indicators (< >) to remind sidebars exist — hover to peek, click to expand.

### Progress Tracking

- Thin progress bar at top of viewport (like a reading indicator)
- Shows on hover: "3/7 files - 43%"
- File checkboxes in the file tree track reviewed state
- Persisted to localStorage keyed by PR URL

## Dependency Ordering

**JS/TS only for v1.** All other languages fall back to GitHub's file order.

### How It Works

1. Get list of changed files from the PR
2. Run `madge` against the local source tree to get a full import graph
3. Filter the graph to only edges between changed files
4. Run `toposort` on the filtered graph
5. Present files in sorted order

### Ordering Modes

- **Bottom-up (default):** Leaves first — utilities, types, helpers. Then consumers. You understand the building blocks before seeing how they're used.
- **Top-down:** Entry points first. See the high-level change, then drill into dependencies.

### Edge Cases

- Circular dependencies: break the cycle, keep both files adjacent
- Files with no imports among changed files (config, README): placed at the end
- Non-JS/TS files in a mixed PR: grouped at the end in GitHub's order

### Dependencies

- `madge` — builds the import dependency graph (handles ES6, CommonJS, TypeScript paths)
- `toposort` — topological sort on the filtered graph

## Data Flow

### CLI Server API (localhost)

The CLI runs a Bun HTTP server that the browser talks to. All GitHub API calls are proxied through this server so no tokens touch the browser.

**Endpoints:**

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/pr` | Full PR payload: metadata, diff, comments, review comments, commits |
| `GET` | `/api/pr/diff?commit=<sha>` | Diff for a specific commit (omit param for full PR diff) |
| `POST` | `/api/comments` | Post a PR comment (body: `{ body: string }`) |
| `POST` | `/api/comments/inline` | Post an inline review comment (body: `{ body, path, line, side }`) |
| `POST` | `/api/comments/reply` | Reply to a comment thread (body: `{ body, commentId }`) |
| `POST` | `/api/review` | Submit review (body: `{ event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT", body? }`) |
| `GET` | `/api/poll` | Long-poll for new comments since last fetch (returns delta) |
| `GET` | `/` | Serve the built React app (static files) |

**Initial load payload shape (`GET /api/pr`):**

```ts
{
  pr: {
    number: number
    title: string
    body: string              // markdown
    author: { login, avatarUrl }
    branch: { head, base }
    labels: string[]
    state: "open" | "closed" | "merged"
  }
  files: {
    path: string
    status: "added" | "modified" | "removed" | "renamed"
    patch: string             // unified diff string
    previousPath?: string     // for renames
  }[]
  fileOrder: string[]          // dependency-sorted file paths (JS/TS sorted, rest in GH order)
  comments: {
    id: number
    author: { login, avatarUrl }
    body: string
    createdAt: string
    type: "pr" | "inline"
    // inline-only fields:
    path?: string
    line?: number
    side?: "LEFT" | "RIGHT"
    inReplyToId?: number      // for threaded replies
  }[]
  commits: {
    sha: string
    message: string
    author: { login }
    date: string
  }[]
}
```

### Mapping GitHub Data to @pierre/diffs

The `@pierre/diffs` component accepts diff content and annotations. The mapping:

- **Diff content**: Each file's `patch` (unified diff string) is passed directly to the diffs component
- **Annotations/threads**: GitHub inline comments are grouped by `(path, line)` into threads. Each thread maps to a `@pierre/diffs` annotation anchored to that line. The annotation content is a React component rendering the comment thread (author, avatar, body, timestamp, reply input, resolve button).
- **Line selection → new comment**: When `onLineSelectionEnd` fires, show a comment input anchored to the selected line range. On submit, `POST /api/comments/inline`.
- **PR-level comments**: These live in the right sidebar Chat tab, not in the diff view.

### State Management

No state library. React state + context is sufficient for this scope.

| State | Location | Persistence |
|---|---|---|
| PR data (metadata, diffs, comments, commits) | React context (`PRContext`) | Refetched on load, updated via poll |
| Current diff view (full PR vs single commit) | React state | None (resets on reload) |
| Sidebar open/closed | React state | localStorage |
| Active right sidebar tab | React state | None |
| File review checkboxes | React state | localStorage keyed by `{owner}/{repo}/pr/{number}` |
| Current file (scroll position) | Derived from Intersection Observer | None |
| File ordering mode (bottom-up/top-down) | React state | localStorage |

### Comment Posting Flow

1. User types comment in a `@pierre/diffs` annotation input (inline) or the Chat tab textarea (PR-level)
2. UI sends `POST /api/comments/inline` or `POST /api/comments` to CLI server
3. CLI server posts to GitHub API via octokit (`createReviewComment` or `createComment`)
4. GitHub API returns the created comment with its ID
5. CLI server returns the comment to the browser
6. Browser optimistically adds it to local state (already shown before response)
7. If the comment starts with `@claude`, a GH Action on the repo picks it up and replies — the reply appears on the next poll cycle

### Commit-Scoped Diffs

- Default view: full PR diff (all changes between base and head)
- Click a commit in the Commits tab → browser calls `GET /api/pr/diff?commit=<sha>`
- CLI server fetches that single commit's diff from GitHub API
- Diff view re-renders with only that commit's files
- File tree updates to show only files in that commit (still dependency-ordered)
- A "Back to full diff" button appears at the top of the diff view
- Review progress checkboxes are scoped to the full PR view (not per-commit)

## Project Structure

```
pr-zen/
  docs/
    superpowers/specs/        # this design doc
  packages/
    cli/                      # Bun CLI + HTTP server
      src/
        index.ts              # entry point: parse args, fetch data, start server
        github.ts             # octokit wrapper: fetch PR, post comments, submit review
        deps.ts               # madge + toposort integration: file ordering
        server.ts             # Bun HTTP server: API routes + static file serving
      package.json
    web/                      # React + Vite frontend
      src/
        App.tsx               # root: layout, keyboard shortcuts, context providers
        components/
          FileTree.tsx         # left sidebar: file list, checkboxes, ordering toggle
          DiffView.tsx         # center: virtualized file diffs using @pierre/diffs
          ContextPanel.tsx     # right sidebar: tabs container
          PRTab.tsx            # right sidebar tab: title, description, labels
          ChatTab.tsx          # right sidebar tab: PR comments, post input
          CommitsTab.tsx       # right sidebar tab: commit list, click to scope
          ProgressBar.tsx      # top: thin reading progress indicator
          BottomBar.tsx        # bottom: review action dropdown, cmd+k hint
          CommandPalette.tsx   # cmd+k: search/action overlay
        hooks/
          usePR.ts            # fetch + poll PR data, expose via context
          useFileOrder.ts     # consume file order from API, handle toggle
          useReviewProgress.ts # checkbox state, localStorage persistence
          useKeyboard.ts      # global keyboard shortcut handler
          useSidebarState.ts  # open/closed state for both sidebars
        context/
          PRContext.tsx        # PR data context provider
        lib/
          api.ts              # fetch wrapper for CLI server endpoints
        index.html
        main.tsx
      package.json
      vite.config.ts
      tailwind.config.ts
  package.json                # workspace root (Bun workspaces)
```

## @claude Integration

Not a feature we build. A comment starting with `@claude` is posted to the PR like any other comment via octokit. A GitHub Action on the repository handles the response. The reply appears when the tool polls for new comments.

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Runtime | Bun | Fast, built-in server, built-in TS, no build step for CLI |
| CLI | Bun script | Single command, no framework needed |
| Web UI | React + Vite | Familiar, fast, good ecosystem |
| Diff rendering | `@pierre/diffs` | Handles diffs, syntax highlighting (Shiki), annotations, comment threads, resolve buttons, line selection, merge conflict UI |
| Virtualization | `@tanstack/virtual` | File-level virtualization for big PRs |
| Dependency graph | madge + toposort | ~30 lines of integration for JS/TS |
| GitHub API | octokit | Official, typed, handles auth |
| Styling | Tailwind CSS | Fast iteration, minimal dark aesthetic |

No database. No auth system. No deployment. The CLI reads `gh auth token`, fetches data, serves the app.

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `j` / `k` | Next / prev file |
| `x` | Mark current file reviewed |
| `c` | Comment on current hunk |
| `Cmd+K` | Command palette |
| `Cmd+[` | Toggle left sidebar (file tree) |
| `Cmd+]` | Toggle right sidebar (context) |
| `Cmd+Enter` | Submit comment / approve |
| `Esc` | Close anything open, return to zen |
| `?` | Show shortcuts overlay |

## Visual Design

- Dark theme by default
- Desaturated diff colors — soft green/red tints, not harsh
- Context (unchanged) lines faded
- Minimal chrome — the code is the UI
- Interactions appear on demand (hover to reveal comment button, etc.)
- One accent color for interactive elements

## Scope Boundaries

**In v1:**
- Single PR review at a time
- JS/TS dependency ordering only
- Local-only (localhost)
- Dark theme only
- `gh` CLI auth only

**Not in v1:**
- Multi-language dependency analysis (Python, Go, etc.)
- Deployed/hosted version
- Light theme
- Multi-PR review sessions
- Real-time comment updates (WebSocket/SSE)
- GitHub OAuth flow
