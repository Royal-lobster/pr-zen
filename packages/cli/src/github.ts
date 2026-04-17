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
  viewed?: boolean;
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
  pullRequestId: string;
}

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

export async function fetchPR(
  owner: string,
  repo: string,
  prNumber: number
): Promise<PRPayload> {
  const kit = await getOctokit();

  const [prRes, filesData, commentsData, reviewCommentsData, commitsData, viewedState] =
    await Promise.all([
      kit.pulls.get({ owner, repo, pull_number: prNumber }),
      kit.paginate(kit.pulls.listFiles, {
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100,
      }),
      kit.paginate(kit.issues.listComments, {
        owner,
        repo,
        issue_number: prNumber,
        per_page: 100,
      }),
      kit.paginate(kit.pulls.listReviewComments, {
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100,
      }),
      kit.paginate(kit.pulls.listCommits, {
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100,
      }),
      fetchViewedState(owner, repo, prNumber),
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

  const knownStatuses = new Set(["added", "modified", "removed", "renamed"]);

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

  const prComments: PRComment[] = commentsData.map((c) => ({
    id: c.id,
    author: {
      login: c.user?.login ?? "unknown",
      avatarUrl: c.user?.avatar_url ?? "",
    },
    body: c.body ?? "",
    createdAt: c.created_at,
    type: "pr" as const,
  }));

  const inlineComments: PRComment[] = reviewCommentsData.map((c) => ({
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

  const commits: PRCommit[] = commitsData.map((c) => ({
    sha: c.sha,
    message: c.commit.message,
    author: { login: c.author?.login ?? c.commit.author?.name ?? "unknown" },
    date: c.commit.author?.date ?? "",
  }));

  return { pr, files, comments, commits, pullRequestId: viewedState.pullRequestId };
}

export async function fetchCommitDiff(
  owner: string,
  repo: string,
  sha: string
): Promise<PRFile[]> {
  const kit = await getOctokit();
  const knownStatuses = new Set(["added", "modified", "removed", "renamed"]);
  const res = await kit.repos.getCommit({ owner, repo, ref: sha });
  return (res.data.files ?? []).map((f) => ({
    path: f.filename,
    status: knownStatuses.has(f.status ?? "")
      ? (f.status as PRFile["status"])
      : "modified",
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
