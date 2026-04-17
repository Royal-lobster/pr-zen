# UI Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the seven UI fixes described in `docs/superpowers/specs/2026-04-17-ui-fixes-design.md`.

**Architecture:** Each fix lands as a separate, independently-committable task. The web app is a Bun+Vite React SPA served by a Bun HTTP server in `packages/cli`. No test framework exists; verification is manual via `bun run dev` + browser.

**Tech Stack:** Bun, TypeScript, React 19, Radix UI, Tailwind, `@pierre/diffs`, `@octokit/rest`.

---

## Verification Workflow

Every task that touches UI must be verified this way before commit:

1. Terminal A: `cd packages/web && bun run dev` (Vite dev server)
2. Terminal B: from a git repo with a real PR: `bun /path/to/pr-zen/packages/cli/src/index.ts <pr-number>`
3. Load the web UI URL printed by the CLI.
4. Exercise the feature. Open DevTools, check for console errors.

TypeScript errors: `cd packages/web && bunx tsc --noEmit` must pass after every task.

---

## Task 1: Fix tab underline alignment

**Files:**
- Modify: `packages/web/src/components/ui/tabs.tsx`

**Context:** Triggers use `flex-1` for equal width, but the `after:` underline is anchored to the trigger's left-2/right-2, not to the label text. "PR" (2 chars) shows a wide underline; "Chat 2" (with pill) shows one offset from the visual center of the label.

- [ ] **Step 1: Rewrite `TabsTrigger` to put the underline under the label**

Replace the component body so the underline is a child `<span>` that wraps only the label content:

```tsx
const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "group relative flex-1 py-2.5 text-xs font-medium transition-colors",
      "text-zen-muted hover:text-zen-text-secondary",
      "data-[state=active]:text-zen-text",
      "flex items-center justify-center",
      className
    )}
    {...props}
  >
    <span className="relative inline-flex items-center justify-center">
      {children}
      <span
        className={cn(
          "absolute -bottom-2.5 left-0 right-0 h-[2px] rounded-full bg-zen-accent",
          "scale-x-0 group-data-[state=active]:scale-x-100",
          "transition-transform duration-200"
        )}
      />
    </span>
  </TabsPrimitive.Trigger>
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;
```

The outer trigger still takes equal width (`flex-1`), but the underline is now pinned to the label span width, so it centers under the text.

- [ ] **Step 2: Verify**

Start the dev server and the CLI with a real PR (per the Verification Workflow). Visually confirm the underline sits centered under each tab's label (PR, Chat 2, Commits 8). Switch tabs — underline animates under the active label text.

- [ ] **Step 3: TypeScript check**

```bash
cd packages/web && bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/ui/tabs.tsx
git commit -m "fix(tabs): center underline under label text, not trigger box"
```

---

## Task 2: Render markdown in comments

**Files:**
- Modify: `packages/web/package.json`
- Create: `packages/web/src/components/Markdown.tsx`
- Modify: `packages/web/src/components/ChatTab.tsx`
- Modify: `packages/web/src/components/CommentThread.tsx`
- Modify: `packages/web/src/components/PRTab.tsx`
- Modify: `packages/web/src/index.css`

**Context:** Three places currently render comment/PR bodies as raw text inside `.zen-prose` with `whitespace-pre-wrap`. Bot comments containing markdown (e.g., Vercel's preview links with headings/tables) and long base64 tokens render unreadably.

- [ ] **Step 1: Install dependencies**

```bash
cd packages/web && bun add react-markdown@^9 remark-gfm@^4
```

- [ ] **Step 2: Create the `Markdown` wrapper**

Create `packages/web/src/components/Markdown.tsx`:

```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "../lib/utils";

interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={cn("zen-prose break-words", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: (props) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
```

- [ ] **Step 3: Ensure long tokens wrap**

Add `overflow-wrap: anywhere;` to `.zen-prose` so base64 blobs in bot comments wrap instead of blowing out the layout.

In `packages/web/src/index.css`, inside the `.zen-prose` rule (around line 66-70), add the overflow-wrap declaration:

```css
  .zen-prose {
    font-size: 0.875rem;
    line-height: 1.625;
    color: rgba(228, 228, 231, 0.8);
    overflow-wrap: anywhere;
    word-break: break-word;
  }
```

- [ ] **Step 4: Use `Markdown` in `ChatTab`**

In `packages/web/src/components/ChatTab.tsx`, replace the comment body render (the `<div className="mt-1 zen-prose text-[13px] whitespace-pre-wrap break-words">{comment.body}</div>` block) with:

```tsx
<Markdown className="mt-1 text-[13px]">{comment.body}</Markdown>
```

Add the import at the top of the file:

```tsx
import { Markdown } from "./Markdown";
```

Remove the now-unused `cn` import if it's no longer used elsewhere in the file (it still is for the textarea className — leave it).

- [ ] **Step 5: Use `Markdown` in `CommentThread`**

In `packages/web/src/components/CommentThread.tsx`, replace the body render (`<div className="zen-prose text-xs whitespace-pre-wrap pl-6">{c.body}</div>`) with:

```tsx
<Markdown className="text-xs pl-6">{c.body}</Markdown>
```

Add the import:

```tsx
import { Markdown } from "./Markdown";
```

- [ ] **Step 6: Use `Markdown` in `PRTab`**

In `packages/web/src/components/PRTab.tsx`, replace the body render (`<div className="zen-prose whitespace-pre-wrap break-words">{pr.body}</div>`) with:

```tsx
<Markdown>{pr.body}</Markdown>
```

Add the import:

```tsx
import { Markdown } from "./Markdown";
```

- [ ] **Step 7: Verify**

Start the dev server, open a PR with bot comments (e.g., a Vercel preview comment with links and markdown). Verify:
- Headings, lists, links, inline code, fenced code blocks render correctly.
- Links open in a new tab.
- Long base64 strings wrap instead of overflowing horizontally.
- PR description renders with markdown.

- [ ] **Step 8: TypeScript check**

```bash
cd packages/web && bunx tsc --noEmit
```

- [ ] **Step 9: Commit**

```bash
git add packages/web/package.json packages/web/bun.lock packages/web/src/components/Markdown.tsx packages/web/src/components/ChatTab.tsx packages/web/src/components/CommentThread.tsx packages/web/src/components/PRTab.tsx packages/web/src/index.css
git commit -m "feat: render markdown in comments and PR description"
```

(If `bun.lock` is at repo root instead of package-local, adjust the `add` path.)

---

## Task 3: Diff display options (split/unified + word-wrap)

**Files:**
- Modify: `packages/web/src/hooks/useDiffStyle.ts` → rename to `useDiffPrefs.ts`
- Create: `packages/web/src/components/DiffOptionsMenu.tsx`
- Modify: `packages/web/src/components/DiffView.tsx`
- Modify: `packages/web/src/App.tsx`
- Modify: `packages/web/src/hooks/useKeyboard.ts`

**Context:** `useDiffStyle` already persists `unified`/`split`. We extend it to also persist `wordWrap: boolean`, wire it through to `PatchDiff.options.overflow`, and add a small options menu in the diff area. Keyboard `w` toggles wrap.

- [ ] **Step 1: Replace `useDiffStyle.ts` with `useDiffPrefs.ts`**

Delete `packages/web/src/hooks/useDiffStyle.ts` and create `packages/web/src/hooks/useDiffPrefs.ts`:

```ts
import { useState, useCallback } from "react";

type DiffStyle = "unified" | "split";

interface DiffPrefs {
  diffStyle: DiffStyle;
  wordWrap: boolean;
}

interface DiffPrefsState extends DiffPrefs {
  toggleDiffStyle: () => void;
  toggleWordWrap: () => void;
}

const STORAGE_KEY = "pr-zen:v1:diff-prefs";
const LEGACY_KEY = "pr-zen:v1:diff-style";

function loadPrefs(): DiffPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DiffPrefs>;
      return {
        diffStyle: parsed.diffStyle === "split" ? "split" : "unified",
        wordWrap: parsed.wordWrap === true,
      };
    }
    // Migrate from legacy single-key storage
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy === "split" || legacy === "unified") {
      return { diffStyle: legacy, wordWrap: false };
    }
  } catch {
    // ignore
  }
  return { diffStyle: "unified", wordWrap: false };
}

function savePrefs(prefs: DiffPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export function useDiffPrefs(): DiffPrefsState {
  const [prefs, setPrefs] = useState<DiffPrefs>(loadPrefs);

  const toggleDiffStyle = useCallback(() => {
    setPrefs((prev) => {
      const next: DiffPrefs = {
        ...prev,
        diffStyle: prev.diffStyle === "unified" ? "split" : "unified",
      };
      savePrefs(next);
      return next;
    });
  }, []);

  const toggleWordWrap = useCallback(() => {
    setPrefs((prev) => {
      const next: DiffPrefs = { ...prev, wordWrap: !prev.wordWrap };
      savePrefs(next);
      return next;
    });
  }, []);

  return { ...prefs, toggleDiffStyle, toggleWordWrap };
}
```

- [ ] **Step 2: Create `DiffOptionsMenu` component**

Create `packages/web/src/components/DiffOptionsMenu.tsx`:

```tsx
import { useState, useRef, useEffect } from "react";
import { Sliders, Check } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

interface DiffOptionsMenuProps {
  diffStyle: "unified" | "split";
  wordWrap: boolean;
  onToggleDiffStyle: () => void;
  onToggleWordWrap: () => void;
}

export function DiffOptionsMenu({
  diffStyle,
  wordWrap,
  onToggleDiffStyle,
  onToggleWordWrap,
}: DiffOptionsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        title="Diff display options"
      >
        <Sliders className="w-3.5 h-3.5" />
      </Button>
      {open && (
        <div
          className={cn(
            "absolute right-0 top-full mt-1 z-20 w-56",
            "bg-zen-elevated border border-zen-border rounded-lg shadow-overlay",
            "p-1 animate-fade-in"
          )}
        >
          <button
            onClick={() => {
              if (diffStyle !== "unified") onToggleDiffStyle();
              setOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md",
              "text-xs text-left hover:bg-zen-surface transition-colors"
            )}
          >
            <Check
              className={cn(
                "w-3 h-3 shrink-0",
                diffStyle === "unified" ? "opacity-100" : "opacity-0"
              )}
            />
            Unified diff
          </button>
          <button
            onClick={() => {
              if (diffStyle !== "split") onToggleDiffStyle();
              setOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md",
              "text-xs text-left hover:bg-zen-surface transition-colors"
            )}
          >
            <Check
              className={cn(
                "w-3 h-3 shrink-0",
                diffStyle === "split" ? "opacity-100" : "opacity-0"
              )}
            />
            Split diff
          </button>
          <div className="h-px bg-zen-border my-1" />
          <button
            onClick={() => {
              onToggleWordWrap();
            }}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md",
              "text-xs text-left hover:bg-zen-surface transition-colors"
            )}
          >
            <Check
              className={cn(
                "w-3 h-3 shrink-0",
                wordWrap ? "opacity-100" : "opacity-0"
              )}
            />
            Word wrap
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wire `wordWrap` into `DiffView`**

In `packages/web/src/components/DiffView.tsx`:

Update the interface:

```tsx
interface DiffViewProps {
  // ...existing...
  diffStyle: "unified" | "split";
  wordWrap: boolean;
}
```

Destructure `wordWrap` in the component params, and in the `PatchDiff` `options` prop, add:

```tsx
options={{
  theme: "pierre-dark",
  diffStyle: diffStyle,
  overflow: wordWrap ? "wrap" : "scroll",
  diffIndicators: "bars",
  hunkSeparators: "line-info-basic",
  expandUnchanged: true,
  lineHoverHighlight: "both",
  enableGutterUtility: true,
  onGutterUtilityClick: (range: { start: number }) => {
    // ...existing handler
  },
}}
```

(Remove the old `overflow: "scroll"` line.)

- [ ] **Step 4: Update `App.tsx` to use `useDiffPrefs` and render the menu**

In `packages/web/src/App.tsx`:

Change the import:

```tsx
import { useDiffPrefs } from "./hooks/useDiffPrefs";
```

Change the hook call:

```tsx
const { diffStyle, wordWrap, toggleDiffStyle, toggleWordWrap } = useDiffPrefs();
```

Pass both to `<DiffView>`:

```tsx
<DiffView
  // ...existing props...
  diffStyle={diffStyle}
  wordWrap={wordWrap}
/>
```

Add the options menu to the center panel header area. Replace the block that conditionally renders the commit banner with:

```tsx
<div className="flex items-center gap-2 px-4 py-2 bg-zen-surface/80 backdrop-blur-sm border-b border-zen-border">
  {activeCommit && (
    <>
      <Button variant="ghost" size="sm" onClick={() => setActiveCommit(null)}>
        <ArrowLeft className="w-3 h-3" />
        Back to full diff
      </Button>
      <Badge variant="accent">{activeCommit.slice(0, 7)}</Badge>
    </>
  )}
  <div className="ml-auto">
    <DiffOptionsMenu
      diffStyle={diffStyle}
      wordWrap={wordWrap}
      onToggleDiffStyle={toggleDiffStyle}
      onToggleWordWrap={toggleWordWrap}
    />
  </div>
</div>
```

Import the new component near the top:

```tsx
import { DiffOptionsMenu } from "./components/DiffOptionsMenu";
```

Update the command palette `commands` array to use the new hook's toggle names (they kept the same name `toggleDiffStyle` so no change there; add a wrap toggle):

```tsx
{
  id: "toggle-wrap",
  label: `${wordWrap ? "Disable" : "Enable"} word wrap`,
  shortcut: "w",
  action: toggleWordWrap,
},
```

Add `wordWrap` and `toggleWordWrap` to the `useMemo` dep array.

- [ ] **Step 5: Add `w` keyboard shortcut**

In `packages/web/src/hooks/useKeyboard.ts`, extend the interface and handler:

```ts
interface KeyboardActions {
  // ...existing...
  toggleDiffStyle: () => void;
  toggleWordWrap: () => void;
}
```

Add a new branch in `handleKeyDown`:

```ts
} else if (e.key === "w" && !meta) {
  e.preventDefault();
  a.toggleWordWrap();
}
```

Wire it in `App.tsx`'s `useKeyboard({...})` call:

```tsx
useKeyboard({
  // ...existing...
  toggleDiffStyle,
  toggleWordWrap,
});
```

- [ ] **Step 6: Verify**

In the running app:
- Click the sliders icon in the diff area header → menu opens.
- Toggle Unified/Split — diff re-renders.
- Toggle Word wrap — long lines wrap vs. scroll horizontally.
- Press `w` — toggles wrap (when not focused in a textarea).
- Reload browser — both prefs persist.
- Legacy users: set `localStorage.setItem('pr-zen:v1:diff-style','split')`, remove the new key, reload — split mode should be restored via the migration path.

- [ ] **Step 7: TypeScript check**

```bash
cd packages/web && bunx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add packages/web/src/hooks/useDiffPrefs.ts packages/web/src/hooks/useKeyboard.ts packages/web/src/components/DiffOptionsMenu.tsx packages/web/src/components/DiffView.tsx packages/web/src/App.tsx
git rm packages/web/src/hooks/useDiffStyle.ts
git commit -m "feat(diff): add split/unified/word-wrap menu and persist prefs"
```

---

## Task 4: File tree — tooltips and tree view toggle

**Files:**
- Create: `packages/web/src/hooks/useFileTreeMode.ts`
- Modify: `packages/web/src/components/FileTree.tsx`

**Context:** Current FileTree uses `truncate` on filenames. Two user asks: (1) see full name somehow, (2) optional true nested-folder view like GitHub's.

- [ ] **Step 1: Create `useFileTreeMode` hook**

Create `packages/web/src/hooks/useFileTreeMode.ts`:

```ts
import { useState, useCallback } from "react";

type FileTreeMode = "flat" | "tree";

interface FileTreeModeState {
  treeMode: FileTreeMode;
  toggleTreeMode: () => void;
}

const STORAGE_KEY = "pr-zen:v1:file-tree-mode";

function loadMode(): FileTreeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "tree" ? "tree" : "flat";
  } catch {
    return "flat";
  }
}

export function useFileTreeMode(): FileTreeModeState {
  const [treeMode, setTreeMode] = useState<FileTreeMode>(loadMode);

  const toggleTreeMode = useCallback(() => {
    setTreeMode((prev) => {
      const next = prev === "flat" ? "tree" : "flat";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return { treeMode, toggleTreeMode };
}
```

- [ ] **Step 2: Add tooltip to filenames (flat view)**

In `packages/web/src/components/FileTree.tsx`, find the file row's filename `<span>` (around line 129):

```tsx
<span
  className={cn(
    "truncate font-mono text-[13px] transition-opacity",
    reviewed && "opacity-40 line-through"
  )}
>
  {fileName}
</span>
```

Change the wrapping `<div>` of the file row to include `title={file.path}`:

```tsx
<div
  key={file.path}
  title={file.path}
  className={cn(
    "flex items-center gap-2 pl-4 pr-3 py-1 cursor-pointer text-[13px]",
    "group/file transition-all duration-100 border-l-2",
    isCurrent
      ? "bg-zen-accent-dim text-zen-text border-zen-accent"
      : "text-zen-text-secondary hover:bg-zen-elevated/50 hover:text-zen-text border-transparent"
  )}
  onClick={() => onFileClick(file.path)}
>
```

The native tooltip now shows the full path on hover.

- [ ] **Step 3: Build the tree data structure**

At the top of `packages/web/src/components/FileTree.tsx` (after the existing `statusColors`/`statusLabels`/`groupByDirectory` helpers), add:

```tsx
interface TreeNode {
  name: string;
  path: string; // full path from root
  children: TreeNode[];
  file?: PRFile; // set if this node is a leaf file
}

function buildTree(files: PRFile[]): TreeNode {
  const root: TreeNode = { name: "", path: "", children: [] };
  const index = new Map<string, TreeNode>();
  index.set("", root);

  for (const file of files) {
    const parts = file.path.split("/");
    let parentPath = "";
    let parent = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const segment = parts[i];
      const nextPath = parentPath ? `${parentPath}/${segment}` : segment;
      let dir = index.get(nextPath);
      if (!dir) {
        dir = { name: segment, path: nextPath, children: [] };
        parent.children.push(dir);
        index.set(nextPath, dir);
      }
      parent = dir;
      parentPath = nextPath;
    }
    const leafName = parts[parts.length - 1];
    parent.children.push({
      name: leafName,
      path: file.path,
      children: [],
      file,
    });
  }

  // Sort: folders first, then files, alphabetical
  function sort(node: TreeNode) {
    node.children.sort((a, b) => {
      const aDir = a.children.length > 0 || !a.file;
      const bDir = b.children.length > 0 || !b.file;
      if (aDir !== bDir) return aDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const c of node.children) sort(c);
  }
  sort(root);

  return root;
}

function countReviewedInTree(
  node: TreeNode,
  isReviewed: (path: string) => boolean
): { reviewed: number; total: number } {
  if (node.file) {
    return { reviewed: isReviewed(node.path) ? 1 : 0, total: 1 };
  }
  let reviewed = 0;
  let total = 0;
  for (const c of node.children) {
    const sub = countReviewedInTree(c, isReviewed);
    reviewed += sub.reviewed;
    total += sub.total;
  }
  return { reviewed, total };
}
```

- [ ] **Step 4: Add `TreeView` component**

Inside `packages/web/src/components/FileTree.tsx`, above the `FileTree` export, add:

```tsx
function TreeNodeView({
  node,
  depth,
  currentFile,
  isReviewed,
  onToggleReviewed,
  onFileClick,
}: {
  node: TreeNode;
  depth: number;
  currentFile: string | null;
  isReviewed: (path: string) => boolean;
  onToggleReviewed: (path: string) => void;
  onFileClick: (path: string) => void;
}) {
  const [open, setOpen] = useState(true);

  if (node.file) {
    const reviewed = isReviewed(node.path);
    const isCurrent = node.path === currentFile;
    return (
      <div
        title={node.path}
        className={cn(
          "flex items-center gap-2 pr-3 py-1 cursor-pointer text-[13px]",
          "group/file transition-all duration-100 border-l-2",
          isCurrent
            ? "bg-zen-accent-dim text-zen-text border-zen-accent"
            : "text-zen-text-secondary hover:bg-zen-elevated/50 hover:text-zen-text border-transparent"
        )}
        style={{ paddingLeft: `${depth * 12 + 16}px` }}
        onClick={() => onFileClick(node.path)}
      >
        <Checkbox
          checked={reviewed}
          onCheckedChange={() => onToggleReviewed(node.path)}
          onClick={(e) => e.stopPropagation()}
        />
        <span
          className={cn(
            "text-2xs font-mono w-4 text-center shrink-0 font-semibold",
            statusColors[node.file.status] ?? "text-zen-muted"
          )}
        >
          {statusLabels[node.file.status] ?? "?"}
        </span>
        <span
          className={cn(
            "truncate font-mono text-[13px] transition-opacity",
            reviewed && "opacity-40 line-through"
          )}
        >
          {node.name}
        </span>
      </div>
    );
  }

  const { reviewed, total } = countReviewedInTree(node, isReviewed);
  const allReviewed = reviewed === total && total > 0;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-1.5 py-1.5 pr-3 text-left transition-colors group",
          "text-zen-muted hover:text-zen-text-secondary"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <ChevronRight
          className={cn(
            "w-3 h-3 shrink-0 transition-transform duration-150 text-zen-muted/60",
            open && "rotate-90"
          )}
        />
        <span className="text-2xs font-mono truncate flex-1 tracking-wide">
          {node.name}/
        </span>
        <span
          className={cn(
            "text-2xs font-mono tabular-nums",
            allReviewed ? "text-zen-add-text/60" : "text-zen-muted/40"
          )}
        >
          {reviewed}/{total}
        </span>
      </button>
      {open && (
        <div>
          {node.children.map((child) => (
            <TreeNodeView
              key={child.path || child.name}
              node={child}
              depth={depth + 1}
              currentFile={currentFile}
              isReviewed={isReviewed}
              onToggleReviewed={onToggleReviewed}
              onFileClick={onFileClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TreeView({
  files,
  currentFile,
  isReviewed,
  onToggleReviewed,
  onFileClick,
}: {
  files: PRFile[];
  currentFile: string | null;
  isReviewed: (path: string) => boolean;
  onToggleReviewed: (path: string) => void;
  onFileClick: (path: string) => void;
}) {
  const root = useMemo(() => buildTree(files), [files]);
  return (
    <div className="py-1 animate-fade-in">
      {root.children.map((child) => (
        <TreeNodeView
          key={child.path || child.name}
          node={child}
          depth={0}
          currentFile={currentFile}
          isReviewed={isReviewed}
          onToggleReviewed={onToggleReviewed}
          onFileClick={onFileClick}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Add mode toggle to `FileTree` header and render appropriate view**

Extend the `FileTreeProps` interface:

```tsx
interface FileTreeProps {
  files: PRFile[];
  currentFile: string | null;
  isReviewed: (path: string) => boolean;
  onToggleReviewed: (path: string) => void;
  onFileClick: (path: string) => void;
  mode: "bottom-up" | "top-down";
  onToggleMode: () => void;
  treeMode: "flat" | "tree";
  onToggleTreeMode: () => void;
}
```

Import `FolderTree` and `List` icons at the top:

```tsx
import { ChevronRight, FolderTree, List } from "lucide-react";
```

Replace the header and body of `FileTree` (the returned JSX) with:

```tsx
return (
  <div className="h-full flex flex-col">
    <div className="flex items-center justify-between px-3 py-2.5 border-b border-zen-border">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-zen-text tracking-tight">
          Files
        </span>
        <span className="text-2xs font-mono text-zen-muted tabular-nums">
          {reviewedCount}/{files.length}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleTreeMode}
          title={`Switch to ${treeMode === "flat" ? "tree" : "flat"} view`}
        >
          {treeMode === "flat" ? (
            <FolderTree className="w-3.5 h-3.5" />
          ) : (
            <List className="w-3.5 h-3.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleMode}
          className="font-mono"
          title={`Switch to ${mode === "bottom-up" ? "top-down" : "bottom-up"}`}
        >
          {mode === "bottom-up" ? "\u2191 dep" : "\u2193 dep"}
        </Button>
      </div>
    </div>
    <ScrollArea className="flex-1">
      {treeMode === "flat" ? (
        <div className="py-1">
          {groups.map((group) => (
            <FolderSection
              key={group.dir || "__root"}
              group={group}
              currentFile={currentFile}
              isReviewed={isReviewed}
              onToggleReviewed={onToggleReviewed}
              onFileClick={onFileClick}
            />
          ))}
        </div>
      ) : (
        <TreeView
          files={files}
          currentFile={currentFile}
          isReviewed={isReviewed}
          onToggleReviewed={onToggleReviewed}
          onFileClick={onFileClick}
        />
      )}
    </ScrollArea>
  </div>
);
```

- [ ] **Step 6: Wire `useFileTreeMode` through `App.tsx`**

In `packages/web/src/App.tsx`:

Import the hook:

```tsx
import { useFileTreeMode } from "./hooks/useFileTreeMode";
```

Call it near the other hooks:

```tsx
const { treeMode, toggleTreeMode } = useFileTreeMode();
```

Pass to `<FileTree>`:

```tsx
<FileTree
  files={orderedFiles}
  currentFile={currentFile}
  isReviewed={isReviewed}
  onToggleReviewed={toggleReviewed}
  onFileClick={handleFileClick}
  mode={mode}
  onToggleMode={toggleMode}
  treeMode={treeMode}
  onToggleTreeMode={toggleTreeMode}
/>
```

Add a command palette entry:

```tsx
{
  id: "toggle-tree-mode",
  label: `Switch to ${treeMode === "flat" ? "tree" : "flat"} file view`,
  action: toggleTreeMode,
},
```

Add `treeMode` and `toggleTreeMode` to the `useMemo` dep array for commands.

- [ ] **Step 7: Verify**

- Toggle view mode → flat → tree. Both render the same files.
- Hover a long filename → native tooltip shows full path.
- Click folder chevrons in tree view — they expand/collapse.
- Reload — mode persists.
- Reviewed checkboxes still work in tree view; the flat/tree folder reviewed-count matches.

- [ ] **Step 8: TypeScript check**

```bash
cd packages/web && bunx tsc --noEmit
```

- [ ] **Step 9: Commit**

```bash
git add packages/web/src/hooks/useFileTreeMode.ts packages/web/src/components/FileTree.tsx packages/web/src/App.tsx
git commit -m "feat(file-tree): add tree view mode and full-path tooltips"
```

---

## Task 5: Multi-line inline comment selection

**Files:**
- Modify: `packages/web/src/components/DiffView.tsx`
- Modify: `packages/web/src/components/InlineCommentForm.tsx`
- Modify: `packages/web/src/App.tsx`
- Modify: `packages/web/src/lib/api.ts`
- Modify: `packages/cli/src/github.ts`
- Modify: `packages/cli/src/server.ts`

**Context:** `@pierre/diffs` `onGutterUtilityClick` provides `{ start, end, side, endSide }`, but the current code uses only `range.start`. GitHub's review-comment API supports multi-line comments via `start_line` + `start_side`.

- [ ] **Step 1: Extend types and server validation**

In `packages/cli/src/github.ts`, update `postInlineComment`:

```ts
export async function postInlineComment(
  owner: string,
  repo: string,
  prNumber: number,
  params: {
    body: string;
    path: string;
    line: number;
    side: string;
    startLine?: number;
    startSide?: string;
  }
): Promise<PRComment> {
  const kit = await getOctokit();
  const commitRes = await kit.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });
  const multiLine =
    params.startLine !== undefined && params.startLine !== params.line;
  const res = await kit.pulls.createReviewComment({
    owner,
    repo,
    pull_number: prNumber,
    commit_id: commitRes.data.head.sha,
    body: params.body,
    path: params.path,
    line: params.line,
    side: params.side as "LEFT" | "RIGHT",
    ...(multiLine
      ? {
          start_line: params.startLine!,
          start_side: (params.startSide ?? params.side) as "LEFT" | "RIGHT",
        }
      : {}),
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
```

- [ ] **Step 2: Update server endpoint validation**

In `packages/cli/src/server.ts`, update the `/api/comments/inline` handler's validation and destructure:

```ts
if (path === "/api/comments/inline" && req.method === "POST") {
  const params = (await req.json()) as {
    body: string;
    path: string;
    line: number;
    side: string;
    startLine?: number;
    startSide?: string;
  };
  const hasValidStart =
    params.startLine === undefined ||
    (Number.isInteger(params.startLine) &&
      (params.startSide === "LEFT" || params.startSide === "RIGHT") &&
      params.startLine <= params.line);
  if (
    typeof params.body !== "string" ||
    params.body.trim().length === 0 ||
    typeof params.path !== "string" ||
    params.path.trim().length === 0 ||
    typeof params.line !== "number" ||
    !Number.isInteger(params.line) ||
    (params.side !== "LEFT" && params.side !== "RIGHT") ||
    !hasValidStart
  ) {
    return Response.json(
      {
        error:
          "body (non-empty string), path (non-empty string), line (integer), side (LEFT|RIGHT) required; if startLine given, startSide (LEFT|RIGHT) required and startLine <= line",
      },
      { status: 400, headers: corsHeaders }
    );
  }
  const comment = await postInlineComment(
    config.owner,
    config.repo,
    config.prNumber,
    params
  );
  if (cachedPayload) cachedPayload.comments.push(comment);
  return Response.json(comment, { headers: corsHeaders });
}
```

- [ ] **Step 3: Update web API client**

In `packages/web/src/lib/api.ts`, update `postInlineComment`:

```ts
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
```

- [ ] **Step 4: Update `pendingComment` state shape in `App.tsx`**

In `packages/web/src/App.tsx`, change the state:

```tsx
const [pendingComment, setPendingComment] = useState<{
  path: string;
  startLine: number;
  endLine: number;
  startSide: string;
  endSide: string;
} | null>(null);
```

Update `handleGutterClick`:

```tsx
const handleGutterClick = useCallback(
  (params: {
    path: string;
    startLine: number;
    endLine: number;
    startSide: "LEFT" | "RIGHT";
    endSide: "LEFT" | "RIGHT";
  }) => {
    setPendingComment(params);
  },
  []
);
```

Update `handleSubmitInlineComment`:

```tsx
const handleSubmitInlineComment = useCallback(
  async (params: {
    body: string;
    path: string;
    line: number;
    side: string;
    startLine?: number;
    startSide?: string;
  }) => {
    const comment = await wrapAction(
      () => api.postInlineComment(params),
      "Failed to post comment"
    );
    if (comment) {
      addComment(comment);
      setPendingComment(null);
    }
  },
  [addComment, wrapAction]
);
```

- [ ] **Step 5: Update `DiffView` to pass start and end through**

In `packages/web/src/components/DiffView.tsx`:

Update the interface:

```tsx
interface PendingComment {
  path: string;
  startLine: number;
  endLine: number;
  startSide: string;
  endSide: string;
}

interface DiffViewProps {
  files: PRFile[];
  comments: PRComment[];
  pendingComment: PendingComment | null;
  onGutterClick: (params: {
    path: string;
    startLine: number;
    endLine: number;
    startSide: "LEFT" | "RIGHT";
    endSide: "LEFT" | "RIGHT";
  }) => void;
  onSubmitInlineComment: (params: {
    body: string;
    path: string;
    line: number;
    side: string;
    startLine?: number;
    startSide?: string;
  }) => Promise<void>;
  onCancelComment: () => void;
  onReplyToComment: (commentId: number, body: string) => Promise<void>;
  fileRef?: (path: string, el: HTMLDivElement | null) => void;
  diffStyle: "unified" | "split";
  wordWrap: boolean;
}
```

Update the `onGutterUtilityClick` handler to use the full range:

```tsx
onGutterUtilityClick: (range: {
  start: number;
  end: number;
  side?: "deletions" | "additions";
  endSide?: "deletions" | "additions";
}) => {
  const startSide = range.side === "deletions" ? "LEFT" : "RIGHT";
  const endSide =
    (range.endSide ?? range.side) === "deletions" ? "LEFT" : "RIGHT";
  onGutterClick({
    path: file.path,
    startLine: range.start,
    endLine: range.end,
    startSide,
    endSide,
  });
},
```

Update the pending annotation to anchor on `endLine` / `endSide`:

```tsx
if (pendingComment && pendingComment.path === file.path) {
  annotations.push({
    lineNumber: pendingComment.endLine,
    side: pendingComment.endSide === "LEFT" ? "deletions" : "additions",
    metadata: { isPending: true },
  });
}
```

And pass the full pending info to the form:

```tsx
renderAnnotation={(ann) =>
  ann.metadata.isPending && pendingComment ? (
    <InlineCommentForm
      path={file.path}
      startLine={pendingComment.startLine}
      endLine={pendingComment.endLine}
      startSide={pendingComment.startSide}
      endSide={pendingComment.endSide}
      onSubmit={onSubmitInlineComment}
      onCancel={onCancelComment}
    />
  ) : ann.metadata.thread ? (
    <CommentThread ... />
  ) : null
}
```

- [ ] **Step 6: Update `InlineCommentForm`**

Replace the component in `packages/web/src/components/InlineCommentForm.tsx`:

```tsx
import { useState, useRef, useEffect, type FormEvent } from "react";
import { Button } from "./ui/button";
import { Kbd } from "./ui/kbd";
import { cn } from "../lib/utils";

interface InlineCommentFormProps {
  path: string;
  startLine: number;
  endLine: number;
  startSide: string;
  endSide: string;
  onSubmit: (params: {
    body: string;
    path: string;
    line: number;
    side: string;
    startLine?: number;
    startSide?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export function InlineCommentForm({
  path,
  startLine,
  endLine,
  startSide,
  endSide,
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
      const payload =
        startLine !== endLine
          ? {
              body: body.trim(),
              path,
              line: endLine,
              side: endSide,
              startLine,
              startSide,
            }
          : {
              body: body.trim(),
              path,
              line: endLine,
              side: endSide,
            };
      await onSubmit(payload);
      onCancel();
    } finally {
      setSubmitting(false);
    }
  }

  const locationLabel =
    startLine === endLine ? `${path}:${endLine}` : `${path}:${startLine}-${endLine}`;

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-zen-accent/20 rounded-lg bg-zen-bg my-1.5 mx-2 p-3 shadow-card animate-fade-in-up"
    >
      <div className="text-2xs text-zen-muted font-mono mb-2">
        {locationLabel}
      </div>
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a comment..."
        rows={3}
        className={cn(
          "w-full bg-zen-surface border border-zen-border rounded-lg px-3 py-2",
          "text-xs font-mono text-zen-text placeholder:text-zen-muted/40",
          "resize-none focus:outline-none focus:border-zen-accent/50",
          "focus:ring-1 focus:ring-zen-accent/20 transition-all duration-150"
        )}
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
      <div className="flex items-center justify-between mt-2">
        <span className="text-2xs text-zen-muted flex items-center gap-0.5">
          <Kbd>{"\u2318"}</Kbd><Kbd>{"\u21B5"}</Kbd> submit
          <span className="mx-1 text-zen-border">|</span>
          <Kbd>esc</Kbd> cancel
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" type="submit" disabled={!body.trim() || submitting}>
            {submitting ? "Posting..." : "Comment"}
          </Button>
        </div>
      </div>
    </form>
  );
}
```

- [ ] **Step 7: Verify**

Using `@pierre/diffs` gutter utility:
- Click-drag across 3 lines in the gutter → `InlineCommentForm` opens at the last line and the header shows `path:startLine-endLine`.
- Submit → comment appears on GitHub spanning those lines (check on github.com).
- Single-line (click without drag) still works; header shows `path:line`.
- After submission, the thread appears inline under the end line.

- [ ] **Step 8: TypeScript check**

```bash
cd packages/web && bunx tsc --noEmit
```

- [ ] **Step 9: Commit**

```bash
git add packages/web/src/components/DiffView.tsx packages/web/src/components/InlineCommentForm.tsx packages/web/src/App.tsx packages/web/src/lib/api.ts packages/cli/src/github.ts packages/cli/src/server.ts
git commit -m "feat(comments): support multi-line inline comment selection"
```

---

## Task 6: Per-file Viewed button + GitHub sync

This task has multiple subtasks because it touches the server, the hook, and multiple UI surfaces. Each subtask is independently committable.

### Task 6a: Fetch and return viewed state from the server

**Files:**
- Modify: `packages/cli/src/github.ts`
- Modify: `packages/cli/src/server.ts`
- Modify: `packages/web/src/lib/api.ts`

**Context:** We need to (1) fetch each file's `viewerViewedState` via GraphQL, (2) expose it on `PRFile`, and (3) expose a mutation endpoint so the web app can write the state back.

- [ ] **Step 1: Add GraphQL fetch + mutate helpers in `github.ts`**

At the top of `packages/cli/src/github.ts`, add an internal helper for GraphQL and the new functions:

```ts
interface GraphQLViewedFile {
  path: string;
  viewerViewedState: "VIEWED" | "NOT_VIEWED" | "DISMISSED";
}

async function graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const kit = await getOctokit();
  return (await kit.graphql(query, variables)) as T;
}

export async function fetchViewedState(
  owner: string,
  repo: string,
  prNumber: number
): Promise<{ pullRequestId: string; viewed: Map<string, boolean> }> {
  const viewed = new Map<string, boolean>();
  let cursor: string | null = null;
  let pullRequestId = "";

  while (true) {
    const res: {
      repository: {
        pullRequest: {
          id: string;
          files: {
            nodes: GraphQLViewedFile[];
            pageInfo: { hasNextPage: boolean; endCursor: string | null };
          };
        };
      };
    } = await graphql(
      `query($owner:String!,$repo:String!,$num:Int!,$cursor:String){
        repository(owner:$owner,name:$repo){
          pullRequest(number:$num){
            id
            files(first:100, after:$cursor){
              nodes{ path viewerViewedState }
              pageInfo{ hasNextPage endCursor }
            }
          }
        }
      }`,
      { owner, repo, num: prNumber, cursor }
    );

    pullRequestId = res.repository.pullRequest.id;
    for (const f of res.repository.pullRequest.files.nodes) {
      viewed.set(f.path, f.viewerViewedState === "VIEWED");
    }
    if (!res.repository.pullRequest.files.pageInfo.hasNextPage) break;
    cursor = res.repository.pullRequest.files.pageInfo.endCursor;
  }

  return { pullRequestId, viewed };
}

export async function setFileViewed(
  pullRequestId: string,
  path: string,
  viewed: boolean
): Promise<void> {
  const mutation = viewed
    ? `mutation($id:ID!,$path:String!){
         markFileAsViewed(input:{pullRequestId:$id,path:$path}){ clientMutationId }
       }`
    : `mutation($id:ID!,$path:String!){
         unmarkFileAsViewed(input:{pullRequestId:$id,path:$path}){ clientMutationId }
       }`;
  await graphql(mutation, { id: pullRequestId, path });
}
```

Extend `PRFile`:

```ts
export interface PRFile {
  path: string;
  status: "added" | "modified" | "removed" | "renamed";
  patch: string;
  previousPath?: string;
  viewed?: boolean;
}
```

Extend `PRPayload`:

```ts
export interface PRPayload {
  pr: PRMetadata;
  files: PRFile[];
  comments: PRComment[];
  commits: PRCommit[];
  pullRequestId: string;
}
```

In `fetchPR`, after computing `files`, call `fetchViewedState` in parallel with the existing fetches and merge the result:

Change the `Promise.all` block to include `fetchViewedState`:

```ts
const [prRes, filesData, commentsData, reviewCommentsData, commitsData, viewedState] =
  await Promise.all([
    kit.pulls.get({ owner, repo, pull_number: prNumber }),
    kit.paginate(kit.pulls.listFiles, { owner, repo, pull_number: prNumber, per_page: 100 }),
    kit.paginate(kit.issues.listComments, { owner, repo, issue_number: prNumber, per_page: 100 }),
    kit.paginate(kit.pulls.listReviewComments, { owner, repo, pull_number: prNumber, per_page: 100 }),
    kit.paginate(kit.pulls.listCommits, { owner, repo, pull_number: prNumber, per_page: 100 }),
    fetchViewedState(owner, repo, prNumber),
  ]);
```

After constructing `files`, merge viewed state:

```ts
const files: PRFile[] = filesData.map((f) => ({
  path: f.filename,
  status: knownStatuses.has(f.status ?? "")
    ? (f.status as PRFile["status"])
    : "modified",
  patch: f.patch ?? "",
  previousPath:
    f.status === "renamed" ? f.previous_filename : undefined,
  viewed: viewedState.viewed.get(f.filename) ?? false,
}));
```

Change the return statement to include `pullRequestId`:

```ts
return { pr, files, comments, commits, pullRequestId: viewedState.pullRequestId };
```

- [ ] **Step 2: Update server to expose viewed endpoint and cache `pullRequestId`**

In `packages/cli/src/server.ts`:

Import the new helper:

```ts
import {
  fetchPR,
  fetchCommitDiff,
  postComment,
  postInlineComment,
  replyToComment,
  submitReview,
  fetchCommentsSince,
  setFileViewed,
} from "./github";
```

Update the `cachedPayload` type to carry `pullRequestId` (it already does via `PRPayload` now that we extended the type).

Add the endpoint handler, grouped with the other POST routes:

```ts
if (path === "/api/files/viewed" && req.method === "POST") {
  const { path: filePath, viewed } = (await req.json()) as {
    path: string;
    viewed: boolean;
  };
  if (
    typeof filePath !== "string" ||
    filePath.trim().length === 0 ||
    typeof viewed !== "boolean"
  ) {
    return Response.json(
      { error: "path (non-empty string) and viewed (boolean) are required" },
      { status: 400, headers: corsHeaders }
    );
  }
  if (!cachedPayload) {
    cachedPayload = await loadPR();
  }
  await setFileViewed(cachedPayload.pullRequestId, filePath, viewed);
  const file = cachedPayload.files.find((f) => f.path === filePath);
  if (file) file.viewed = viewed;
  return Response.json({ ok: true }, { headers: corsHeaders });
}
```

- [ ] **Step 3: Update web API client**

In `packages/web/src/lib/api.ts`:

Extend `PRFile`:

```ts
export interface PRFile {
  path: string;
  status: "added" | "modified" | "removed" | "renamed";
  patch: string;
  previousPath?: string;
  viewed?: boolean;
}
```

Extend `PRPayload`:

```ts
export interface PRPayload {
  pr: PRMetadata;
  files: PRFile[];
  fileOrder: string[];
  comments: PRComment[];
  commits: PRCommit[];
  pullRequestId: string;
}
```

Add the `setViewed` API method:

```ts
setViewed: (path: string, viewed: boolean) =>
  fetchJSON<{ ok: boolean }>("/api/files/viewed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, viewed }),
  }),
```

- [ ] **Step 4: Verify server**

Run `bun /path/to/pr-zen/packages/cli/src/index.ts <pr-number>`, open DevTools, run in console:

```js
fetch("/api/pr").then(r => r.json()).then(d => console.log(d.files.map(f => ({ path: f.path, viewed: f.viewed })), d.pullRequestId));
```

Expected: files array with `viewed` booleans, and a non-empty `pullRequestId`.

Test the mutation endpoint:

```js
fetch("/api/files/viewed", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ path: "<a file path from the PR>", viewed: true }),
}).then(r => r.json()).then(console.log);
```

Expected: `{ ok: true }`. On github.com, the file should now show the "Viewed" checkbox checked.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/github.ts packages/cli/src/server.ts packages/web/src/lib/api.ts
git commit -m "feat(server): sync per-file viewed state with GitHub"
```

### Task 6b: Replace `useReviewProgress` with `useViewedState`

**Files:**
- Create: `packages/web/src/hooks/useViewedState.ts`
- Delete: `packages/web/src/hooks/useReviewProgress.ts`
- Modify: `packages/web/src/App.tsx`

**Context:** The existing `useReviewProgress` persists only to localStorage. The new hook seeds from server data and writes back.

- [ ] **Step 1: Create `useViewedState` hook**

Create `packages/web/src/hooks/useViewedState.ts`:

```ts
import { useState, useCallback, useEffect, useRef } from "react";
import { api, type PRFile } from "../lib/api";

const STORAGE_PREFIX = "pr-zen:v1:viewed:";
const MAX_STORED_PRS = 20;

interface ViewedState {
  toggleViewed: (path: string) => Promise<void>;
  isViewed: (path: string) => boolean;
  viewedCount: number;
}

function storageKey(prKey: string | undefined) {
  return `${STORAGE_PREFIX}${prKey ?? "unknown"}`;
}

function loadCache(prKey: string | undefined): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(prKey));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveCache(prKey: string | undefined, set: Set<string>) {
  try {
    localStorage.setItem(storageKey(prKey), JSON.stringify([...set]));
    pruneOldKeys();
  } catch {
    // ignore
  }
}

function pruneOldKeys() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(STORAGE_PREFIX)) keys.push(k);
    }
    if (keys.length > MAX_STORED_PRS) {
      keys.sort();
      const toRemove = keys.slice(0, keys.length - MAX_STORED_PRS);
      for (const k of toRemove) localStorage.removeItem(k);
    }
  } catch {
    // ignore
  }
}

export function useViewedState(
  prKey: string | undefined,
  files: PRFile[],
  onError: (message: string) => void
): ViewedState {
  const [viewed, setViewed] = useState<Set<string>>(() => loadCache(prKey));
  const seededFromServer = useRef(false);

  // Seed from server the first time we receive files with viewed booleans.
  useEffect(() => {
    if (seededFromServer.current) return;
    if (files.length === 0) return;
    const next = new Set<string>();
    for (const f of files) {
      if (f.viewed) next.add(f.path);
    }
    setViewed(next);
    saveCache(prKey, next);
    seededFromServer.current = true;
  }, [files, prKey]);

  // When prKey changes, reset and re-seed.
  useEffect(() => {
    seededFromServer.current = false;
    setViewed(loadCache(prKey));
  }, [prKey]);

  const toggleViewed = useCallback(
    async (path: string) => {
      const currentlyViewed = viewed.has(path);
      const nextValue = !currentlyViewed;
      // Optimistic update
      setViewed((prev) => {
        const next = new Set(prev);
        if (nextValue) next.add(path);
        else next.delete(path);
        saveCache(prKey, next);
        return next;
      });
      try {
        await api.setViewed(path, nextValue);
      } catch (e) {
        // Revert on error
        setViewed((prev) => {
          const next = new Set(prev);
          if (currentlyViewed) next.add(path);
          else next.delete(path);
          saveCache(prKey, next);
          return next;
        });
        onError(
          e instanceof Error ? e.message : "Failed to sync viewed state"
        );
      }
    },
    [viewed, prKey, onError]
  );

  const isViewed = useCallback((path: string) => viewed.has(path), [viewed]);

  return { toggleViewed, isViewed, viewedCount: viewed.size };
}
```

- [ ] **Step 2: Delete `useReviewProgress`**

```bash
git rm packages/web/src/hooks/useReviewProgress.ts
```

- [ ] **Step 3: Wire `useViewedState` into `App.tsx`**

In `packages/web/src/App.tsx`, replace:

```tsx
import { useReviewProgress } from "./hooks/useReviewProgress";
```

with:

```tsx
import { useViewedState } from "./hooks/useViewedState";
```

Replace the hook call:

```tsx
const { isReviewed, toggleReviewed, reviewedCount } = useReviewProgress(prKey);
```

with:

```tsx
const { isViewed, toggleViewed, viewedCount } = useViewedState(
  prKey,
  currentFiles,
  (msg) => setActionError(msg)
);
```

Replace all call sites of `isReviewed` → `isViewed`, `toggleReviewed` → `toggleViewed`, `reviewedCount` → `viewedCount`. Specifically:

- `<ProgressBar reviewedCount={reviewedCount} ...>` → `<ProgressBar reviewedCount={viewedCount} ...>` (keep prop name; it's a label inside `ProgressBar`)
- `<FileTree ... isReviewed={isReviewed} onToggleReviewed={toggleReviewed} ...>` → `isReviewed={isViewed}` and `onToggleReviewed={toggleViewed}`. The FileTree prop names stay the same; only the bound value changes.
- The keyboard handler `markReviewed: () => { if (currentFile) toggleReviewed(currentFile); }` → `markReviewed: () => { if (currentFile) toggleViewed(currentFile); }`.

Note: `toggleViewed` is now async. `markReviewed` doesn't need to await it.

- [ ] **Step 4: Verify**

- Load a PR with a file you've already marked viewed on GitHub. pr-zen should render it as reviewed.
- Toggle a file's checkbox in the FileTree. Open the same PR on github.com — it should now show Viewed for that file.
- Untick on GitHub, reload pr-zen → reflects unchecked.
- Kill network, click a checkbox → toast surfaces error; UI reverts.

- [ ] **Step 5: TypeScript check**

```bash
cd packages/web && bunx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/hooks/useViewedState.ts packages/web/src/App.tsx
git commit -m "feat(review): replace local reviewed state with GitHub-synced viewed"
```

### Task 6c: Add Viewed button to diff header

**Files:**
- Modify: `packages/web/src/components/DiffView.tsx`

**Context:** The diff header currently shows file path + status badge. Add a GitHub-style Viewed checkbox/button on the right side of each file's diff header.

- [ ] **Step 1: Extend `DiffView` props**

In `packages/web/src/components/DiffView.tsx`:

```tsx
interface DiffViewProps {
  // ...existing props...
  isViewed: (path: string) => boolean;
  onToggleViewed: (path: string) => void;
}
```

Destructure in the function.

- [ ] **Step 2: Update `renderHeaderPrefix`**

Inside the `PatchDiff` block, change the prop name from `renderHeaderPrefix` to a richer header. We'll replace `renderHeaderPrefix` content to include the Viewed button on the right. Since `renderHeaderPrefix` is a prefix, and the existing `Badge` sits at `ml-auto`, we append the Viewed control after the badge.

Replace the existing `renderHeaderPrefix` with:

```tsx
renderHeaderPrefix={() => {
  const viewed = isViewed(file.path);
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 w-full">
      <FileCode className="w-3.5 h-3.5 text-zen-muted shrink-0" />
      <span className="text-xs font-mono text-zen-text truncate" title={file.path}>
        {file.path}
      </span>
      {file.previousPath && (
        <span className="flex items-center gap-1 text-xs text-zen-muted shrink-0">
          <ArrowLeft className="w-3 h-3" />
          <span className="font-mono truncate max-w-[150px]">{file.previousPath}</span>
        </span>
      )}
      <Badge variant={statusBadgeVariant[file.status] ?? "default"} className="ml-auto shrink-0">
        {file.status}
      </Badge>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleViewed(file.path);
        }}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md border text-2xs transition-colors shrink-0",
          viewed
            ? "bg-zen-accent-dim border-zen-accent/40 text-zen-accent"
            : "bg-zen-surface border-zen-border text-zen-text-secondary hover:border-zen-muted"
        )}
        title={viewed ? "Mark as unviewed" : "Mark as viewed"}
      >
        <span
          className={cn(
            "w-3 h-3 rounded-sm border flex items-center justify-center shrink-0",
            viewed
              ? "bg-zen-accent border-zen-accent text-zen-bg"
              : "border-zen-muted"
          )}
        >
          {viewed && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
        </span>
        Viewed
      </button>
    </div>
  );
}}
```

Import `Check`:

```tsx
import { FileCode, ArrowLeft, Check } from "lucide-react";
```

Also add `title={file.path}` to the non-patch fallback header so tooltips work there too.

- [ ] **Step 3: Wire props from `App.tsx`**

```tsx
<DiffView
  files={orderedFiles}
  comments={data.comments}
  pendingComment={pendingComment}
  onGutterClick={handleGutterClick}
  onSubmitInlineComment={handleSubmitInlineComment}
  onCancelComment={() => setPendingComment(null)}
  onReplyToComment={handleReplyToComment}
  fileRef={handleFileRef}
  diffStyle={diffStyle}
  wordWrap={wordWrap}
  isViewed={isViewed}
  onToggleViewed={toggleViewed}
/>
```

- [ ] **Step 4: Verify**

- Each file in the diff view shows a Viewed button in its header.
- Click the button → optimistic UI update, then on github.com the file reflects the change.
- Click twice to unview — same round-trip.
- The FileTree checkbox and the diff header button stay in sync (both read from `isViewed`, both call `toggleViewed`).
- The progress bar count updates.

- [ ] **Step 5: TypeScript check**

```bash
cd packages/web && bunx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/components/DiffView.tsx packages/web/src/App.tsx
git commit -m "feat(diff): add GitHub-style Viewed button to file header"
```

---

## Task 7: Investigate and fix commits-tab file scope

**Files (potentially):**
- `packages/web/src/hooks/usePR.ts`
- `packages/web/src/App.tsx`
- `packages/cli/src/github.ts`

**Context:** Spec calls this an investigate-first task. `fetchCommitDiff` already calls `repos.getCommit` which returns only files from that commit. User reports they see all PR files when a commit is selected.

- [ ] **Step 1: Reproduce**

With a PR that has 3+ commits and where commit 1 touches different files than commit 3:
1. Run pr-zen on the PR.
2. Open the Commits tab, click commit 1.
3. Note which files appear in the FileTree and diff view.
4. Click commit 3. Note changes.

Expected: FileTree shows only commit 1's files, then only commit 3's files.

Document findings: if already working, go to Step 4 and add a clearer banner. If broken, continue.

- [ ] **Step 2: If broken — trace the data flow**

Likely candidates:
- Network tab → `GET /api/pr/diff?commit=<sha>` returns correct file list but UI shows stale.
- `usePR.currentFiles` derivation: `commitFiles ?? data?.files`. If `commitFiles` is `null`, we fall back to all files. Check if `setCommitFiles` is called after the fetch resolves.
- Race condition: if user clicks a commit then quickly another, the slower response may land last.

For each candidate, add a `console.log` in `setActiveCommit`'s async handler, confirm or refute.

- [ ] **Step 3: Fix the root cause**

If the issue is the silent `catch` in `setActiveCommit`, surface the error:

```ts
const setActiveCommit = useCallback(
  async (sha: string | null) => {
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
      throw e;
    }
  },
  []
);
```

If the issue is race conditions, add an abort controller or sequence guard:

```ts
const latestSha = useRef<string | null>(null);

const setActiveCommit = useCallback(async (sha: string | null) => {
  latestSha.current = sha;
  setActiveCommitState(sha);
  if (!sha) { ... return; }
  try {
    const { files, fileOrder } = await api.getDiff(sha);
    if (latestSha.current !== sha) return; // stale response
    setCommitFiles(files);
    setCommitFileOrder(fileOrder);
  } catch (e) { ... }
}, []);
```

If the issue is elsewhere (e.g., `orderedFiles` being incorrectly computed), fix at the real source. Do not introduce a second overlapping file-list source of truth.

- [ ] **Step 4: Add a clearer "Showing commit X" banner**

Independent of whether the bug existed, improve the banner so the scope is obvious. In `App.tsx`, the existing banner shows only a Back button + SHA badge. Replace with:

```tsx
{activeCommit && (
  <>
    <Button variant="ghost" size="sm" onClick={() => setActiveCommit(null)}>
      <ArrowLeft className="w-3 h-3" />
      Back to full diff
    </Button>
    <Badge variant="accent">{activeCommit.slice(0, 7)}</Badge>
    <span className="text-2xs text-zen-muted">
      Showing {orderedFiles.length} file{orderedFiles.length === 1 ? "" : "s"} from this commit
    </span>
  </>
)}
```

- [ ] **Step 5: Verify**

- Clicking a commit shows only that commit's files in both FileTree and diff view.
- The banner states "Showing N files from this commit."
- Rapid clicking across commits doesn't leave the view in an inconsistent state.

- [ ] **Step 6: TypeScript check**

```bash
cd packages/web && bunx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/hooks/usePR.ts packages/web/src/App.tsx
git commit -m "fix(commits): ensure commit view shows only that commit's files"
```

(Adjust files/message based on what the investigation actually required.)

---

## Final integration checks

After all tasks are complete, end-to-end test:

- [ ] **Step 1: Run on a representative PR**

Pick a PR with: multiple commits, files in nested directories with long names, a bot comment containing markdown, and at least one previously-viewed file.

Exercise every feature: tab switching, markdown rendering, file tree modes, diff options, multi-line comment, Viewed sync, commit scoping.

- [ ] **Step 2: Build sanity**

```bash
cd packages/web && bun run build
```

Expected: clean build with no TypeScript errors.

- [ ] **Step 3: No console errors**

With the app running, navigate through all tabs, toggle all options, and view a few files. DevTools console should be clean.
