// ============================================================
// MCP DevBridge - GitHub MCP Server
// Provides tools for interacting with GitHub repositories,
// issues, and pull requests via the GitHub REST API.
// ============================================================

import { Octokit } from "octokit";
import { BaseMcpServer, McpError } from "../shared/mcp-protocol";
import {
  ToolDefinition,
  ToolResult,
  Resource,
  ResourceContent,
  JSON_RPC_ERRORS,
} from "../shared/types";
import { githubTools } from "./tools";

class GitHubMcpServer extends BaseMcpServer {
  private octokit: Octokit;
  private hasToken: boolean;

  constructor() {
    super(
      "github-server",
      "1.0.0",
      "MCP server for GitHub operations - list repos, manage issues, view pull requests"
    );

    const token = process.env.GITHUB_TOKEN || "";
    this.hasToken = token.length > 0;
    this.octokit = new Octokit({ auth: token || undefined });
  }

  async listTools(): Promise<ToolDefinition[]> {
    return githubTools;
  }

  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    switch (name) {
      case "list_repos":
        return this.listRepos(args);
      case "get_repo":
        return this.getRepo(args);
      case "create_issue":
        return this.createIssue(args);
      case "list_issues":
        return this.listIssues(args);
      case "get_pull_requests":
        return this.getPullRequests(args);
      default:
        throw new McpError(
          JSON_RPC_ERRORS.METHOD_NOT_FOUND,
          `Unknown tool: ${name}`
        );
    }
  }

  async listResources(): Promise<Resource[]> {
    return [
      {
        uri: "github://status",
        name: "GitHub Connection Status",
        description: "Current GitHub API connection status and rate limits",
        mimeType: "application/json",
      },
    ];
  }

  async readResource(uri: string): Promise<ResourceContent> {
    if (uri === "github://status" || uri === "status") {
      try {
        const rateLimit = await this.octokit.rest.rateLimit.get();
        return {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              authenticated: this.hasToken,
              rateLimit: {
                limit: rateLimit.data.rate.limit,
                remaining: rateLimit.data.rate.remaining,
                reset: new Date(
                  rateLimit.data.rate.reset * 1000
                ).toISOString(),
              },
            },
            null,
            2
          ),
        };
      } catch (error) {
        return {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              authenticated: this.hasToken,
              error: String(error),
            },
            null,
            2
          ),
        };
      }
    }

    throw new McpError(
      JSON_RPC_ERRORS.INVALID_PARAMS,
      `Unknown resource: ${uri}`
    );
  }

  // --- Tool Implementations ---

  private async listRepos(
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const owner = args.owner as string | undefined;
    const type = (args.type as string) || "all";
    const sort = (args.sort as string) || "updated";
    const perPage = parseInt((args.per_page as string) || "30", 10);

    try {
      let repos;
      if (owner) {
        repos = await this.octokit.rest.repos.listForUser({
          username: owner,
          type: type as "all" | "owner" | "member",
          sort: sort as "created" | "updated" | "pushed" | "full_name",
          per_page: Math.min(perPage, 100),
        });
      } else {
        if (!this.hasToken) {
          return {
            content: [
              {
                type: "text",
                text: "No GitHub token configured. Set GITHUB_TOKEN environment variable to list your repositories, or provide an 'owner' parameter to list public repos for a user.",
              },
            ],
            isError: true,
          };
        }
        repos = await this.octokit.rest.repos.listForAuthenticatedUser({
          type: type as "all" | "owner" | "public" | "private" | "member",
          sort: sort as "created" | "updated" | "pushed" | "full_name",
          per_page: Math.min(perPage, 100),
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted = (repos.data as any[]).map((repo: any) => ({
        name: repo.full_name,
        description: repo.description || "No description",
        language: repo.language || "Unknown",
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        open_issues: repo.open_issues_count,
        updated_at: repo.updated_at,
        html_url: repo.html_url,
        private: repo.private,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                total: formatted.length,
                repositories: formatted,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return this.formatError("list_repos", error);
    }
  }

  private async getRepo(args: Record<string, unknown>): Promise<ToolResult> {
    const owner = args.owner as string;
    const repo = args.repo as string;

    if (!owner || !repo) {
      return {
        content: [
          {
            type: "text",
            text: "Missing required parameters: 'owner' and 'repo' are required.",
          },
        ],
        isError: true,
      };
    }

    try {
      const repoData = await this.octokit.rest.repos.get({ owner, repo });
      const r = repoData.data;

      const result = {
        full_name: r.full_name,
        description: r.description,
        language: r.language,
        stars: r.stargazers_count,
        forks: r.forks_count,
        watchers: r.watchers_count,
        open_issues: r.open_issues_count,
        default_branch: r.default_branch,
        created_at: r.created_at,
        updated_at: r.updated_at,
        pushed_at: r.pushed_at,
        html_url: r.html_url,
        clone_url: r.clone_url,
        topics: r.topics,
        license: r.license?.spdx_id || "None",
        private: r.private,
        archived: r.archived,
        size_kb: r.size,
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.formatError("get_repo", error);
    }
  }

  private async createIssue(
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const owner = args.owner as string;
    const repo = args.repo as string;
    const title = args.title as string;
    const body = (args.body as string) || "";
    const labelsStr = args.labels as string | undefined;
    const assigneesStr = args.assignees as string | undefined;

    if (!owner || !repo || !title) {
      return {
        content: [
          {
            type: "text",
            text: "Missing required parameters: 'owner', 'repo', and 'title' are required.",
          },
        ],
        isError: true,
      };
    }

    if (!this.hasToken) {
      return {
        content: [
          {
            type: "text",
            text: "GitHub token is required to create issues. Set GITHUB_TOKEN environment variable.",
          },
        ],
        isError: true,
      };
    }

    try {
      const labels = labelsStr
        ? labelsStr.split(",").map((l) => l.trim())
        : [];
      const assignees = assigneesStr
        ? assigneesStr.split(",").map((a) => a.trim())
        : [];

      const issue = await this.octokit.rest.issues.create({
        owner,
        repo,
        title,
        body,
        labels,
        assignees,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                id: issue.data.id,
                number: issue.data.number,
                title: issue.data.title,
                state: issue.data.state,
                html_url: issue.data.html_url,
                created_at: issue.data.created_at,
                labels: issue.data.labels.map((l: any) =>
                  typeof l === "string" ? l : l.name
                ),
                assignees: issue.data.assignees?.map((a: any) => a.login) || [],
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return this.formatError("create_issue", error);
    }
  }

  private async listIssues(
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const owner = args.owner as string;
    const repo = args.repo as string;
    const state = (args.state as "open" | "closed" | "all") || "open";
    const labelsStr = args.labels as string | undefined;
    const assignee = args.assignee as string | undefined;
    const perPage = parseInt((args.per_page as string) || "30", 10);

    if (!owner || !repo) {
      return {
        content: [
          {
            type: "text",
            text: "Missing required parameters: 'owner' and 'repo' are required.",
          },
        ],
        isError: true,
      };
    }

    try {
      const params: Record<string, unknown> = {
        owner,
        repo,
        state,
        per_page: Math.min(perPage, 100),
      };
      if (labelsStr) params.labels = labelsStr;
      if (assignee) params.assignee = assignee;

      const issues = await this.octokit.rest.issues.listForRepo(
        params as Parameters<typeof this.octokit.rest.issues.listForRepo>[0]
      );

      // Filter out pull requests (GitHub API returns PRs in issues endpoint)
      const issuesOnly = issues.data.filter((i: any) => !i.pull_request);

      const formatted = issuesOnly.map((issue: any) => ({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        author: issue.user?.login || "unknown",
        labels: issue.labels.map((l: any) =>
          typeof l === "string" ? l : l.name
        ),
        assignees: issue.assignees?.map((a: any) => a.login) || [],
        comments: issue.comments,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        html_url: issue.html_url,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                total: formatted.length,
                state,
                issues: formatted,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return this.formatError("list_issues", error);
    }
  }

  private async getPullRequests(
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const owner = args.owner as string;
    const repo = args.repo as string;
    const state = (args.state as "open" | "closed" | "all") || "open";
    const sort =
      (args.sort as "created" | "updated" | "popularity" | "long-running") ||
      "created";
    const direction = (args.direction as "asc" | "desc") || "desc";
    const perPage = parseInt((args.per_page as string) || "30", 10);

    if (!owner || !repo) {
      return {
        content: [
          {
            type: "text",
            text: "Missing required parameters: 'owner' and 'repo' are required.",
          },
        ],
        isError: true,
      };
    }

    try {
      const pulls = await this.octokit.rest.pulls.list({
        owner,
        repo,
        state,
        sort,
        direction,
        per_page: Math.min(perPage, 100),
      });

      const formatted = pulls.data.map((pr: any) => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        author: pr.user?.login || "unknown",
        head: pr.head.ref,
        base: pr.base.ref,
        draft: pr.draft,
        mergeable_state: pr.mergeable_state,
        labels: pr.labels.map((l: any) => l.name),
        requested_reviewers:
          pr.requested_reviewers?.map((r: any) => r.login) || [],
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        html_url: pr.html_url,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                total: formatted.length,
                state,
                pull_requests: formatted,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return this.formatError("get_pull_requests", error);
    }
  }

  private formatError(toolName: string, error: unknown): ToolResult {
    const message =
      error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `GitHub API error in ${toolName}: ${message}`,
        },
      ],
      isError: true,
    };
  }
}

// Start the server
const server = new GitHubMcpServer();
server.start();
