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
    console.log(
      "  --repo owner/repo  GitHub repository (auto-detected from git remote)"
    );
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
      return { prNumber: 0, owner: "", repo: "" }; // unreachable
    }
    owner = match[1]!;
    repo = match[2]!;
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
