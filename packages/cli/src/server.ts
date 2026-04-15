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

export function startServer(config: ServerConfig): {
  port: number;
  stop: () => void;
} {
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
            {
              files: cachedPayload.files,
              fileOrder: cachedPayload.fileOrder,
            },
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
          const existingIds = new Set(
            cachedPayload.comments.map((c) => c.id)
          );
          for (const c of newComments) {
            if (!existingIds.has(c.id)) {
              cachedPayload.comments.push(c);
            }
          }
        }
        return Response.json(
          { comments: newComments },
          { headers: corsHeaders }
        );
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

      return Response.json(
        { error: "Not found" },
        { status: 404, headers: corsHeaders }
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal server error";
      return Response.json(
        { error: message },
        { status: 500, headers: corsHeaders }
      );
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
