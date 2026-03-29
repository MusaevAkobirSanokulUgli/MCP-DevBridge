// ============================================================
// MCP DevBridge - FileSystem Server Tool Definitions
// ============================================================

import { ToolDefinition } from "../shared/types";

export const filesystemTools: ToolDefinition[] = [
  {
    name: "list_files",
    description:
      "List files and directories at a given path within the sandbox. Returns file names, sizes, types, and modification times.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "Relative path within the sandbox directory (default: root of sandbox)",
          default: ".",
        },
        recursive: {
          type: "string",
          description:
            'If "true", list files recursively (default: "false")',
          default: "false",
        },
        pattern: {
          type: "string",
          description:
            'Glob pattern to filter files (e.g., "*.ts", "**/*.json")',
        },
      },
      required: [],
    },
  },
  {
    name: "read_file",
    description:
      "Read the contents of a file within the sandbox. Supports text files with optional line range selection.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Relative path to the file within the sandbox",
        },
        start_line: {
          type: "string",
          description: "Starting line number (1-based, default: 1)",
          default: "1",
        },
        end_line: {
          type: "string",
          description:
            "Ending line number (inclusive, default: end of file)",
        },
        encoding: {
          type: "string",
          description: "File encoding (default: utf-8)",
          default: "utf-8",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description:
      "Write content to a file within the sandbox. Creates the file if it doesn't exist, overwrites if it does. Parent directories are created automatically.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Relative path to the file within the sandbox",
        },
        content: {
          type: "string",
          description: "Content to write to the file",
        },
        append: {
          type: "string",
          description:
            'If "true", append to the file instead of overwriting (default: "false")',
          default: "false",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "search_files",
    description:
      "Search for files containing a specific text pattern within the sandbox. Returns matching file paths and line numbers.",
    inputSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description:
            "Text pattern or regular expression to search for in file contents",
        },
        path: {
          type: "string",
          description:
            "Relative directory path to search in (default: entire sandbox)",
          default: ".",
        },
        file_pattern: {
          type: "string",
          description:
            'Glob pattern to filter which files to search (e.g., "*.ts")',
        },
        case_sensitive: {
          type: "string",
          description:
            'If "false", perform case-insensitive search (default: "true")',
          default: "true",
        },
        max_results: {
          type: "string",
          description: "Maximum number of matching lines to return (default: 50)",
          default: "50",
        },
      },
      required: ["pattern"],
    },
  },
];
