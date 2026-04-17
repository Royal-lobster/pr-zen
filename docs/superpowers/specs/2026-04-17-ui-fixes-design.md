# UI Fixes & Enhancements — Design

Date: 2026-04-17
Scope: Seven UI/UX issues in the pr-zen web app.

## Summary

Seven fixes grouped into three themes:
- **Render quality**: tab underline alignment (#1), markdown in comments (#2)
- **Navigation & layout**: file tree view modes + long-name handling (#3), commits-tab scope (#5)
- **Review controls**: per-file viewed button + GitHub sync (#4), diff display options (#6), multi-line inline comments (#7)

Each fix is independent. No shared scaffolding beyond a small `<Markdown>` helper and a `useDiffPrefs` hook extracted from the current `useDiffStyle`.

---

## 1. Tab underline alignment

**Files:** `packages/web/src/components/ui/tabs.tsx`

**Problem:** `TabsTrigger` uses `flex-1` so each trigger takes equal width, but the labels ("PR", "Chat 2", "Commits 8") differ in rendered width. The underline is absolutely positioned to the trigger's left-2/right-2, so it floats off-center under the label text.

**Fix:** Replace the trigger's fixed-position `after:` pseudo-element with a structure that puts the underline under the *label span* instead of the *trigger box*. Concretely:

- Keep `TabsTrigger` as `flex-1` for equal hit-targets.
- Wrap children in an internal span that is `inline-flex justify-center items-center` and place the underline pseudo-element on that span (or render a real `<span>` sibling positioned under the label's bounds).
- Simplest execution: make the underline a child `<span>` rendered inside `TabsTrigger`, width matching the label text, centered below it. Use `data-[state=active]` on the trigger to toggle opacity/scale.

**Test:** Visually verify underline is centered under label text on PR (2-char), Chat (with badge), Commits (with badge).

---

## 2. Markdown rendering in comments

**Files:**
- `packages/web/package.json` (add deps)
- New: `packages/web/src/components/Markdown.tsx`
- `packages/web/src/components/ChatTab.tsx`
- `packages/web/src/components/CommentThread.tsx`
- `packages/web/src/components/PRTab.tsx`

**Problem:** Comment bodies are rendered with `whitespace-pre-wrap` — raw text only. Bot comments (e.g., Vercel preview links) contain markdown and base64 tokens that render as unreadable walls.

**Fix:**
- Add `react-markdown` + `remark-gfm` to `@pr-zen/web` deps.
- Create a `<Markdown>` component that wraps `ReactMarkdown` with `remark-gfm`, using our existing `.zen-prose` class for styling.
  - Restrict to safe tags (no raw HTML by default — `react-markdown` is safe by default).
  - For links: open in new tab (`target="_blank" rel="noopener noreferrer"`).
  - For code blocks and inline code: inherit `.zen-prose` styles.
- Replace the three raw-body render sites:
  - `ChatTab` line 66 (PR comments list)
  - `CommentThread` line 51 (threaded inline comments)
  - `PRTab` line 65 (PR description)
- Preserve break-behavior for long unbroken tokens (like the Vercel base64 blob): add `break-words overflow-wrap-anywhere` to the `.zen-prose` container.

**Test:** Paste a markdown sample with headings, lists, code blocks, and links. Verify it renders. Also verify a long base64 string wraps instead of overflowing.

---

## 3. File tree: scrollable names + true tree view

**Files:**
- `packages/web/src/components/FileTree.tsx`
- New: `packages/web/src/hooks/useFileTreeMode.ts` (persists `"flat" | "tree"` to localStorage)

**Problems:**
- Long filenames are truncated with `truncate` — user can't see full name.
- User wants a second rendering mode: a true nested tree like GitHub's (Image #6), in addition to the current flat-grouped view.

**Fix:**

### View mode toggle
- Add `useFileTreeMode()` hook returning `{ mode: "flat" | "tree", toggleMode }`, persisted to `localStorage` key `pr-zen:v1:file-tree-mode`. Default: `"flat"`.
- Render a small icon toggle in the FileTree header next to the existing dep-direction button. Icons: flat-list / tree.

### Long-name handling
- Remove `truncate` on the filename span.
- Wrap each row in a container that allows horizontal overflow (`overflow-x-auto` on the row, or a `text-ellipsis` with `title={file.path}` tooltip). Preferred: keep row width constrained but show **full path** in a native tooltip (`title` attribute) and **truncate with overflow-scroll on hover** to let the user scroll horizontally by mousing over. Simpler: just add `title={file.path}` tooltip and keep truncate — the user can hover to read. **Recommended approach: native tooltip + keep truncate.** This is the minimal change that satisfies "I can see the full name."
- For the tree view, same approach: truncate + tooltip.

### Tree view layout
- New `TreeView` component inside `FileTree.tsx`:
  - Build a trie from `files.map(f => f.path)`.
  - Render folders as collapsible rows with `ChevronRight` / `ChevronDown`; each folder shows its `reviewed/total` count like the current flat-grouped view.
  - Folder rows and file rows align vertically; file rows show the checkbox, status letter (A/M/D/R), and filename.
  - Default all folders to open.
- Flat view stays as-is (current `FolderSection` rendering).

**Test:**
- Toggle between flat and tree — both render the same files, styled consistently.
- Hover a long filename — tooltip shows full path.
- Toggle persists across reload.

---

## 4. Per-file "Viewed" button + GitHub sync

**Files:**
- `packages/cli/src/github.ts` (add `fetchViewedState`, `markFileAsViewed`, `unmarkFileAsViewed`)
- `packages/cli/src/server.ts` (add `/api/files/viewed` POST endpoint; augment `/api/pr` response with per-file `viewed` state)
- `packages/web/src/lib/api.ts` (add `setViewed`; extend `PRFile` with `viewed`)
- `packages/web/src/hooks/useReviewProgress.ts` → rename/reshape into `useViewedState.ts` that syncs to server instead of localStorage (keep localStorage as a fallback cache)
- `packages/web/src/components/DiffView.tsx` (add Viewed checkbox to `renderHeaderPrefix`)
- `packages/web/src/components/FileTree.tsx` (checkboxes stay — they call the same toggle)

**Problems:**
- No per-file viewed control in the diff header.
- Review state is local-only; doesn't show up on GitHub mobile.

**Fix:**

### Data model
- GitHub stores viewed state per `(viewer, pr, path)`. Reads via GraphQL:
  ```graphql
  query($owner:String!,$repo:String!,$num:Int!) {
    repository(owner:$owner,name:$repo) {
      pullRequest(number:$num) {
        files(first: 100) {
          nodes { path viewerViewedState }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  }
  ```
  (Paginate if needed.) Writes via mutations `markFileAsViewed` / `unmarkFileAsViewed` on `pullRequestId`.

### Server
- In `fetchPR`, after fetching files, fetch viewed state via GraphQL and attach `viewed: boolean` to each `PRFile`. Also fetch and return the `pullRequest.id` (node ID) for future mutations.
- Add `POST /api/files/viewed` taking `{ path: string, viewed: boolean }` — calls the GraphQL mutation with the PR node ID.
- Cache the PR node ID in `cachedPayload` alongside the existing fields.

### Web state
- Replace `useReviewProgress` with `useViewedState(prKey, initialFromServer)`:
  - Seeded from server-provided `files[*].viewed`.
  - `toggleViewed(path)` → optimistic local flip → `api.setViewed(path, next)` → revert on error (plus `useActionError` toast).
  - Keep localStorage mirror so we don't flicker if server is slow on reload.

### UI
- In `DiffView.renderHeaderPrefix`, add a viewed checkbox to the right of the status badge. Style like GitHub's (outlined box + "Viewed" label, filled when checked).
- In `FileTree`, the existing checkbox now calls `toggleViewed` (same hook). No visual change.
- `ProgressBar` still reads from the same hook; count updates work identically.

**Test:**
- Check viewed on a file in pr-zen; confirm the file shows viewed on GitHub web and mobile.
- Uncheck on GitHub, reload pr-zen; state matches.
- Simulate failing mutation (disconnect network) — toast shows, UI reverts.

---

## 5. Commits tab: only that commit's files

**Files:** `packages/cli/src/github.ts`, `packages/web/src/hooks/usePR.ts`, `packages/web/src/components/FileTree.tsx`, `packages/web/src/components/DiffView.tsx` — investigation first, likely minimal code change.

**Investigation plan:**
1. Confirm reproducer: open a PR with multiple commits, click a commit in `CommitsTab`, see if all PR files or only commit's files are shown.
2. Current path: `setActiveCommit(sha)` → `api.getDiff(sha)` → `fetchCommitDiff` → `repos.getCommit` — returns only files in that commit.
3. Check `usePR.currentFiles` derivation: `commitFiles ?? data?.files`. If `commitFiles` is correctly set, this should show commit-only files.

**Hypotheses to verify:**
- `orderedFiles` in `App.tsx` might be seeded from something other than `currentFiles` (it isn't — it's from `useFileOrder(currentFiles, ...)`). Probably fine.
- `FileTree` might receive a different list than `DiffView`. Check both accept `orderedFiles`.
- Maybe `repos.getCommit` returns the full PR's files because of a bug in how we call it, or missing patch content makes us fall back.

**Likely fix:** Either this already works and the user misread the screenshot, or there's a silent error in `api.getDiff` that falls back to showing full-PR files. Instrument with console error, verify with a real PR, then fix the actual cause. If the fallback path is at fault, don't fall back silently — surface the error.

**Deliverable:** Either "already works, UX clarified" (e.g., add a clearer "Showing commit X" banner at the top) or a specific bug fix with a test case. Document findings in the implementation plan.

---

## 6. Diff display options: split/unified/word-wrap

**Files:**
- `packages/web/src/hooks/useDiffStyle.ts` → rename to `useDiffPrefs.ts`
- `packages/web/src/components/DiffView.tsx` (pass new `wordWrap` to `PatchDiff.options.overflow`)
- `packages/web/src/App.tsx` (pass prefs, wire toggles)
- New: `packages/web/src/components/DiffOptionsMenu.tsx` — small popover in the diff area

**Fix:**
- Extend `useDiffStyle` → `useDiffPrefs`:
  ```ts
  { diffStyle: "unified" | "split"; wordWrap: boolean;
    toggleDiffStyle(); toggleWordWrap(); }
  ```
  Persist both under `pr-zen:v1:diff-style` (rename to `pr-zen:v1:diff-prefs`, migrate old value on read).
- Add a `DiffOptionsMenu` — a compact icon button (sliders icon) placed at the top-right of the center diff area (next to the commit banner). Opens a small floating panel with three switches: Unified/Split toggle, Word wrap toggle. Render using existing Radix primitives (the project doesn't have a Popover; use a plain absolute-positioned panel with click-outside via a Dialog or a lightweight custom popover — keep it simple with a `useRef` + effect).
- In `DiffView`, pass `overflow: wordWrap ? "wrap" : "scroll"` to `PatchDiff.options`.
- Keyboard: keep `toggleDiffStyle` shortcut; add `w` for wrap toggle. Register in `useKeyboard`.

**Test:**
- Toggle split/unified — diff re-renders.
- Toggle word-wrap — long lines wrap vs. scroll.
- Reload — both prefs persist.
- Kbd `w` toggles wrap.

---

## 7. Multi-line inline comment selection

**Files:**
- `packages/web/src/components/DiffView.tsx`
- `packages/web/src/components/InlineCommentForm.tsx`
- `packages/web/src/App.tsx` (state shape)
- `packages/cli/src/github.ts` (extend `postInlineComment` with `startLine` + `startSide`)
- `packages/cli/src/server.ts` (input schema)
- `packages/web/src/lib/api.ts` (types)

**Problem:** `onGutterUtilityClick` receives `{ start, end, side, endSide }` but `DiffView` uses only `range.start`. User can't create multi-line comments.

**Fix:**

### State
Change `pendingComment`:
```ts
{ path: string; startLine: number; endLine: number; startSide: string; endSide: string }
```
(If `startLine === endLine`, it's a single-line comment.)

### Gutter click handler
```ts
onGutterUtilityClick: (range) => onGutterClick({
  path: file.path,
  startLine: range.start,
  endLine: range.end,
  startSide: range.side === "deletions" ? "LEFT" : "RIGHT",
  endSide: (range.endSide ?? range.side) === "deletions" ? "LEFT" : "RIGHT",
})
```

### Annotation
Place the comment form annotation on `endLine` + `endSide` (matches GitHub's convention — the form appears at the end of the range).

### Form
- Show `path:startLine-endLine` in the header when multi-line; single line shown as-is.
- On submit, send all four fields.

### API & server
- Extend `api.postInlineComment` to include `startLine?: number`, `startSide?: string`.
- In `postInlineComment` (github.ts), call `kit.pulls.createReviewComment` with:
  - `line: endLine`, `side: endSide`
  - If `startLine !== endLine`: also `start_line: startLine`, `start_side: startSide`.
- Validate server-side: if `startLine` present, require `startSide` and `startLine <= endLine`.

**Test:**
- Click & drag across 3 lines in the gutter → form opens on the last line, shows `L4-L6`, submit posts a GitHub multi-line comment that appears spanning those lines on GH web.
- Single-line still works.

---

## Risks & non-goals

**Risks:**
- GraphQL viewed-state fetch adds a round-trip to initial load; should be fast and done in parallel with other PR fetches.
- Multi-line comments: GitHub rejects mismatched sides (LEFT-RIGHT crosses) — should surface as a toast, not a crash.
- `react-markdown` bundle size is ~40KB gzipped; acceptable.

**Non-goals:**
- No change to commenting UX shortcuts beyond what's documented.
- Not adding image/attachment support in markdown.
- Not redesigning the Progress bar / BottomBar.
- Not adding a "Mark all viewed" bulk action.

---

## Implementation order

1. **#1 Tab underline** (pure CSS, no deps) — trivial, unblocks visual polish.
2. **#2 Markdown** (adds one dep, three call sites).
3. **#6 Diff options** (extract hook, add menu).
4. **#3 File tree view** (new mode + tooltip).
5. **#7 Multi-line comments** (touches both client and server; small, focused).
6. **#4 Viewed sync** (biggest change: GraphQL + new endpoint + hook reshape).
7. **#5 Commits scope** — investigation last, since it may already work and only need a UX clarification.
