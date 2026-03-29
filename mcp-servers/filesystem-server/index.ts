// ============================================================
// MCP DevBridge - FileSystem MCP Server
// Provides sandboxed file system operations: list, read, write,
// and search files within a configured directory.
// ============================================================

import fs from "fs";
import path from "path";
import { glob } from "glob";
import * as mimeTypes from "mime-types";
import { BaseMcpServer, McpError } from "../shared/mcp-protocol";
import {
  ToolDefinition,
  ToolResult,
  Resource,
  ResourceContent,
  JSON_RPC_ERRORS,
} from "../shared/types";
import { filesystemTools } from "./tools";

class FileSystemMcpServer extends BaseMcpServer {
  private sandboxDir: string;

  constructor() {
    super(
      "filesystem-server",
      "1.0.0",
      "MCP server for sandboxed file system operations - list, read, write, and search files"
    );

    this.sandboxDir = path.resolve(
      process.env.SANDBOX_DIR || path.join(process.cwd(), "sandbox")
    );

    // Ensure the sandbox directory exists with some sample content
    this.initializeSandbox();
  }

  private initializeSandbox(): void {
    if (!fs.existsSync(this.sandboxDir)) {
      fs.mkdirSync(this.sandboxDir, { recursive: true });
    }

    // Create sample files if sandbox is empty
    const entries = fs.readdirSync(this.sandboxDir);
    if (entries.length === 0) {
      console.log("[filesystem-server] Creating sample files in sandbox...");

      // Create sample project structure
      const dirs = [
        "src",
        "src/components",
        "src/utils",
        "docs",
        "config",
        "tests",
      ];
      for (const dir of dirs) {
        fs.mkdirSync(path.join(this.sandboxDir, dir), { recursive: true });
      }

      const sampleFiles: Record<string, string> = {
        "README.md": `# Sample Project

This is a sample project created by the MCP DevBridge FileSystem Server.

## Structure

- \`src/\` - Source code
- \`docs/\` - Documentation
- \`config/\` - Configuration files
- \`tests/\` - Test files

## Getting Started

1. Install dependencies
2. Run the development server
3. Open the browser
`,
        "package.json": JSON.stringify(
          {
            name: "sample-project",
            version: "1.0.0",
            description: "A sample project for MCP DevBridge",
            main: "src/index.ts",
            scripts: {
              start: "node dist/index.js",
              build: "tsc",
              test: "jest",
            },
            dependencies: {
              express: "^4.21.0",
            },
            devDependencies: {
              typescript: "^5.7.0",
              jest: "^29.7.0",
            },
          },
          null,
          2
        ),
        "src/index.ts": `import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Hello from Sample Project!" });
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`,
        "src/components/Button.tsx": `import React from "react";

interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  variant = "primary",
  disabled = false,
}) => {
  const baseClasses = "px-4 py-2 rounded-lg font-medium transition-colors";
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };

  return (
    <button
      className={\`\${baseClasses} \${variantClasses[variant]}\`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
};
`,
        "src/utils/helpers.ts": `/**
 * Format a date to a human-readable string
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Generate a random ID string
 */
export function generateId(length: number = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Truncate a string to a maximum length
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
`,
        "config/app.json": JSON.stringify(
          {
            app: {
              name: "Sample Project",
              version: "1.0.0",
              environment: "development",
            },
            server: {
              port: 3000,
              host: "localhost",
              cors: {
                enabled: true,
                origins: ["http://localhost:3000"],
              },
            },
            logging: {
              level: "info",
              format: "json",
            },
          },
          null,
          2
        ),
        "docs/architecture.md": `# Architecture

## Overview

The application follows a layered architecture pattern:

1. **Presentation Layer** - React components
2. **API Layer** - Express REST endpoints
3. **Business Logic Layer** - Service classes
4. **Data Access Layer** - Database queries

## Data Flow

Client -> API Gateway -> Service -> Repository -> Database

## Security

- JWT authentication
- RBAC authorization
- Input validation with Zod
- Rate limiting
`,
        "tests/helpers.test.ts": `import { formatDate, generateId, truncate, deepClone } from "../src/utils/helpers";

describe("formatDate", () => {
  it("should format a date correctly", () => {
    const date = new Date("2024-01-15");
    const result = formatDate(date);
    expect(result).toContain("January");
    expect(result).toContain("15");
    expect(result).toContain("2024");
  });
});

describe("generateId", () => {
  it("should generate an ID of the specified length", () => {
    const id = generateId(12);
    expect(id).toHaveLength(12);
  });

  it("should generate unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe("truncate", () => {
  it("should truncate long strings", () => {
    const result = truncate("Hello, World!", 8);
    expect(result).toBe("Hello...");
  });

  it("should not truncate short strings", () => {
    const result = truncate("Hi", 10);
    expect(result).toBe("Hi");
  });
});

describe("deepClone", () => {
  it("should create a deep copy", () => {
    const obj = { a: 1, b: { c: 2 } };
    const clone = deepClone(obj);
    clone.b.c = 99;
    expect(obj.b.c).toBe(2);
  });
});
`,
      };

      for (const [filePath, content] of Object.entries(sampleFiles)) {
        const fullPath = path.join(this.sandboxDir, filePath);
        fs.writeFileSync(fullPath, content, "utf-8");
      }

      console.log("[filesystem-server] Sample files created successfully.");
    }
  }

  /**
   * Resolve a user-provided path within the sandbox, preventing directory traversal.
   */
  private resolveSafePath(userPath: string): string {
    const resolved = path.resolve(this.sandboxDir, userPath);
    if (!resolved.startsWith(this.sandboxDir)) {
      throw new McpError(
        JSON_RPC_ERRORS.INVALID_PARAMS,
        `Path '${userPath}' escapes the sandbox directory. Access denied.`
      );
    }
    return resolved;
  }

  async listTools(): Promise<ToolDefinition[]> {
    return filesystemTools;
  }

  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    switch (name) {
      case "list_files":
        return this.listFiles(args);
      case "read_file":
        return this.readFile(args);
      case "write_file":
        return this.writeFile(args);
      case "search_files":
        return this.searchFiles(args);
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
        uri: "fs://info",
        name: "FileSystem Info",
        description: "Information about the sandbox directory",
        mimeType: "application/json",
      },
    ];
  }

  async readResource(uri: string): Promise<ResourceContent> {
    if (uri === "fs://info" || uri === "info") {
      const countFiles = (dir: string): number => {
        let count = 0;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            count += countFiles(path.join(dir, entry.name));
          } else {
            count++;
          }
        }
        return count;
      };

      return {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(
          {
            sandbox_directory: this.sandboxDir,
            total_files: countFiles(this.sandboxDir),
          },
          null,
          2
        ),
      };
    }

    throw new McpError(
      JSON_RPC_ERRORS.INVALID_PARAMS,
      `Unknown resource: ${uri}`
    );
  }

  // --- Tool Implementations ---

  private async listFiles(
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const userPath = (args.path as string) || ".";
    const recursive = (args.recursive as string) === "true";
    const pattern = args.pattern as string | undefined;

    try {
      const resolvedPath = this.resolveSafePath(userPath);

      if (!fs.existsSync(resolvedPath)) {
        return {
          content: [
            { type: "text", text: `Path '${userPath}' does not exist.` },
          ],
          isError: true,
        };
      }

      const stat = fs.statSync(resolvedPath);
      if (!stat.isDirectory()) {
        return {
          content: [
            {
              type: "text",
              text: `Path '${userPath}' is not a directory.`,
            },
          ],
          isError: true,
        };
      }

      let files: string[];
      if (pattern) {
        files = await glob(pattern, {
          cwd: resolvedPath,
          nodir: false,
          dot: false,
        });
      } else if (recursive) {
        files = await glob("**/*", {
          cwd: resolvedPath,
          nodir: false,
          dot: false,
        });
      } else {
        files = fs.readdirSync(resolvedPath);
      }

      const entries = files.map((file) => {
        const fullPath = path.join(resolvedPath, file);
        try {
          const fileStat = fs.statSync(fullPath);
          const mime = fileStat.isFile()
            ? mimeTypes.lookup(file) || "application/octet-stream"
            : "directory";
          return {
            name: file,
            type: fileStat.isDirectory() ? "directory" : "file",
            size: fileStat.size,
            mime_type: mime,
            modified: fileStat.mtime.toISOString(),
            created: fileStat.birthtime.toISOString(),
          };
        } catch {
          return {
            name: file,
            type: "unknown",
            size: 0,
            mime_type: "unknown",
            modified: "",
            created: "",
          };
        }
      });

      // Sort: directories first, then alphabetically
      entries.sort((a, b) => {
        if (a.type === "directory" && b.type !== "directory") return -1;
        if (a.type !== "directory" && b.type === "directory") return 1;
        return a.name.localeCompare(b.name);
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                path: userPath,
                total: entries.length,
                entries,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) throw error;
      return {
        content: [
          {
            type: "text",
            text: `Error listing files: ${String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async readFile(
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const userPath = args.path as string;
    const startLine = parseInt((args.start_line as string) || "1", 10);
    const endLineStr = args.end_line as string | undefined;
    const encoding = (args.encoding as BufferEncoding) || "utf-8";

    if (!userPath) {
      return {
        content: [
          { type: "text", text: "Missing required parameter: 'path'" },
        ],
        isError: true,
      };
    }

    try {
      const resolvedPath = this.resolveSafePath(userPath);

      if (!fs.existsSync(resolvedPath)) {
        return {
          content: [
            {
              type: "text",
              text: `File '${userPath}' does not exist.`,
            },
          ],
          isError: true,
        };
      }

      const stat = fs.statSync(resolvedPath);
      if (stat.isDirectory()) {
        return {
          content: [
            {
              type: "text",
              text: `'${userPath}' is a directory. Use list_files instead.`,
            },
          ],
          isError: true,
        };
      }

      // Limit file size to 5MB
      if (stat.size > 5 * 1024 * 1024) {
        return {
          content: [
            {
              type: "text",
              text: `File '${userPath}' is too large (${(stat.size / 1024 / 1024).toFixed(1)}MB). Maximum readable size is 5MB.`,
            },
          ],
          isError: true,
        };
      }

      const content = fs.readFileSync(resolvedPath, encoding);
      const lines = content.split("\n");
      const totalLines = lines.length;

      const start = Math.max(1, startLine) - 1;
      const end = endLineStr
        ? Math.min(parseInt(endLineStr, 10), totalLines)
        : totalLines;

      const selectedLines = lines.slice(start, end);
      const mime =
        mimeTypes.lookup(resolvedPath) || "application/octet-stream";

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                path: userPath,
                mime_type: mime,
                size: stat.size,
                total_lines: totalLines,
                showing_lines: {
                  from: start + 1,
                  to: Math.min(end, totalLines),
                },
                content: selectedLines.join("\n"),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) throw error;
      return {
        content: [
          {
            type: "text",
            text: `Error reading file: ${String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async writeFile(
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const userPath = args.path as string;
    const content = args.content as string;
    const append = (args.append as string) === "true";

    if (!userPath || content === undefined) {
      return {
        content: [
          {
            type: "text",
            text: "Missing required parameters: 'path' and 'content'",
          },
        ],
        isError: true,
      };
    }

    try {
      const resolvedPath = this.resolveSafePath(userPath);

      // Ensure parent directory exists
      const parentDir = path.dirname(resolvedPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      if (append) {
        fs.appendFileSync(resolvedPath, content, "utf-8");
      } else {
        fs.writeFileSync(resolvedPath, content, "utf-8");
      }

      const stat = fs.statSync(resolvedPath);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                path: userPath,
                action: append ? "appended" : "written",
                size: stat.size,
                lines: content.split("\n").length,
                modified: stat.mtime.toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) throw error;
      return {
        content: [
          {
            type: "text",
            text: `Error writing file: ${String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async searchFiles(
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const pattern = args.pattern as string;
    const userPath = (args.path as string) || ".";
    const filePattern = args.file_pattern as string | undefined;
    const caseSensitive = (args.case_sensitive as string) !== "false";
    const maxResults = parseInt((args.max_results as string) || "50", 10);

    if (!pattern) {
      return {
        content: [
          {
            type: "text",
            text: "Missing required parameter: 'pattern'",
          },
        ],
        isError: true,
      };
    }

    try {
      const resolvedPath = this.resolveSafePath(userPath);

      if (!fs.existsSync(resolvedPath)) {
        return {
          content: [
            { type: "text", text: `Path '${userPath}' does not exist.` },
          ],
          isError: true,
        };
      }

      // Get all files to search
      const globPattern = filePattern || "**/*";
      const files = await glob(globPattern, {
        cwd: resolvedPath,
        nodir: true,
        dot: false,
      });

      const regex = new RegExp(pattern, caseSensitive ? "g" : "gi");
      const matches: Array<{
        file: string;
        line: number;
        column: number;
        text: string;
      }> = [];

      for (const file of files) {
        if (matches.length >= maxResults) break;

        const fullPath = path.join(resolvedPath, file);
        try {
          const stat = fs.statSync(fullPath);
          // Skip binary/large files
          if (stat.size > 1024 * 1024) continue;

          const content = fs.readFileSync(fullPath, "utf-8");
          const lines = content.split("\n");

          for (let i = 0; i < lines.length; i++) {
            if (matches.length >= maxResults) break;

            const line = lines[i];
            regex.lastIndex = 0;
            const match = regex.exec(line);
            if (match) {
              matches.push({
                file,
                line: i + 1,
                column: match.index + 1,
                text: line.trim(),
              });
            }
          }
        } catch {
          // Skip files that can't be read
          continue;
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                pattern,
                search_path: userPath,
                case_sensitive: caseSensitive,
                total_matches: matches.length,
                truncated: matches.length >= maxResults,
                matches,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) throw error;
      return {
        content: [
          {
            type: "text",
            text: `Error searching files: ${String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
}

// Start the server
const server = new FileSystemMcpServer();
server.start();
