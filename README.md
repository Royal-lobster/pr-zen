# pr-zen

A lightweight, local-first code review tool for GitHub PRs.

## Why

GitHub's PR review UI gets in the way of actually reading code:

- **Too much noise** — CI checks, labels, merge buttons, suggested reviewers, file tree clutter. You're there to read code, not manage a dashboard.
- **Files in random order** — You open a PR with 15 changed files and have to figure out where to start. Should you read the types first? The hook? The page component? GitHub doesn't help.
- **Context switching** — You're deep in a file diff and forget what the PR is about. You scroll up to re-read the description, lose your place, scroll back down.
- **AI-assisted review is clunky** — You want to ask "why did they change this?" on a specific line. Copy the code, open ChatGPT, paste it, explain the context. By the time you get an answer you've lost your flow.

No existing tool solves all of these. Reviewable has file checkboxes but is aging. Graphite orders PRs in a stack but not files within a PR. CodeRabbit does AI review but has no custom UI. **Dependency-ordered file viewing doesn't exist anywhere.**

## What

pr-zen gives you:

- **Dependency-ordered file navigation** — For JS/TS projects, files are sorted by their import graph. Read the utilities and types first, then the things that use them. Toggle between bottom-up and top-down.
- **Three-panel zen layout** — File tree (left), diff (center), context (right). Both sidebars collapse for distraction-free reading.
- **Always-visible PR context** — Title, description, and comment thread in the right sidebar. Never lose track of what you're reviewing.
- **Inline comments and threads** — Comment on lines, reply to threads, resolve discussions. All synced to GitHub.
- **Review progress tracking** — Check off files as you review them. Progress bar at the top keeps you motivated.
- **Approve / Request Changes** — Complete the review without leaving the tool.
- **@claude support** — Post a comment starting with `@claude` and your repo's GitHub Action handles the rest. The reply appears in your review.
- **Keyboard-first** — `j/k` to navigate files, `x` to mark reviewed, `c` to comment, `Cmd+K` for command palette.

## How

```bash
# Navigate to your repo
cd my-project

# Review PR #1234
pr-zen 1234
```

Opens a minimal web UI on localhost. Auth comes from your `gh` CLI token — if you can `gh pr view`, you can use pr-zen. Works with private repos out of the box.

## Tech

- **Runtime**: Bun
- **Diff rendering**: [@pierre/diffs](https://diffs.com) — handles syntax highlighting, inline annotations, comment threads, resolve buttons
- **Dependency analysis**: madge + toposort (JS/TS only)
- **GitHub API**: octokit, proxied through the local CLI server
- **UI**: React, Tailwind, @tanstack/virtual

No database. No auth system. No deployment. No accounts.
