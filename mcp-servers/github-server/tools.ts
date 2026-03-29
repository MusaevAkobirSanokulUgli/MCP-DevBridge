// ============================================================
// MCP DevBridge - GitHub Server Tool Definitions
// ============================================================

import { ToolDefinition } from "../shared/types";

export const githubTools: ToolDefinition[] = [
  {
    name: "list_repos",
    description:
      "List repositories for the authenticated user or a specified organization/user. Returns repository names, descriptions, languages, and star counts.",
    inputSchema: {
      type: "object",
      properties: {
        owner: {
          type: "string",
          description:
            "GitHub username or organization name. If omitted, lists repos for the authenticated user.",
        },
        type: {
          type: "string",
          description: "Type of repositories to list",
          enum: ["all", "owner", "public", "private", "member"],
          default: "all",
        },
        sort: {
          type: "string",
          description: "Sort field for results",
          enum: ["created", "updated", "pushed", "full_name"],
          default: "updated",
        },
        per_page: {
          type: "string",
          description: "Number of results per page (max 100)",
          default: "30",
        },
      },
      required: [],
    },
  },
  {
    name: "get_repo",
    description:
      "Get detailed information about a specific repository including description, language, star count, fork count, open issues, and recent activity.",
    inputSchema: {
      type: "object",
      properties: {
        owner: {
          type: "string",
          description: "Repository owner (username or organization)",
        },
        repo: {
          type: "string",
          description: "Repository name",
        },
      },
      required: ["owner", "repo"],
    },
  },
  {
    name: "create_issue",
    description:
      "Create a new issue in a GitHub repository with a title, body, labels, and assignees.",
    inputSchema: {
      type: "object",
      properties: {
        owner: {
          type: "string",
          description: "Repository owner",
        },
        repo: {
          type: "string",
          description: "Repository name",
        },
        title: {
          type: "string",
          description: "Issue title",
        },
        body: {
          type: "string",
          description: "Issue body/description (Markdown supported)",
        },
        labels: {
          type: "string",
          description: "Comma-separated list of label names",
        },
        assignees: {
          type: "string",
          description: "Comma-separated list of usernames to assign",
        },
      },
      required: ["owner", "repo", "title"],
    },
  },
  {
    name: "list_issues",
    description:
      "List issues for a repository with filtering by state, labels, and assignee.",
    inputSchema: {
      type: "object",
      properties: {
        owner: {
          type: "string",
          description: "Repository owner",
        },
        repo: {
          type: "string",
          description: "Repository name",
        },
        state: {
          type: "string",
          description: "Filter by issue state",
          enum: ["open", "closed", "all"],
          default: "open",
        },
        labels: {
          type: "string",
          description: "Comma-separated list of label names to filter by",
        },
        assignee: {
          type: "string",
          description: "Filter by assignee username",
        },
        per_page: {
          type: "string",
          description: "Number of results per page (max 100)",
          default: "30",
        },
      },
      required: ["owner", "repo"],
    },
  },
  {
    name: "get_pull_requests",
    description:
      "List pull requests for a repository with filtering by state, head branch, and base branch.",
    inputSchema: {
      type: "object",
      properties: {
        owner: {
          type: "string",
          description: "Repository owner",
        },
        repo: {
          type: "string",
          description: "Repository name",
        },
        state: {
          type: "string",
          description: "Filter by PR state",
          enum: ["open", "closed", "all"],
          default: "open",
        },
        sort: {
          type: "string",
          description: "Sort field",
          enum: ["created", "updated", "popularity", "long-running"],
          default: "created",
        },
        direction: {
          type: "string",
          description: "Sort direction",
          enum: ["asc", "desc"],
          default: "desc",
        },
        per_page: {
          type: "string",
          description: "Number of results per page (max 100)",
          default: "30",
        },
      },
      required: ["owner", "repo"],
    },
  },
];
