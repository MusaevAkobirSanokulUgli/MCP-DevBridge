// ============================================================
// MCP DevBridge - Database Server Tool Definitions
// ============================================================

import { ToolDefinition } from "../shared/types";

export const databaseTools: ToolDefinition[] = [
  {
    name: "list_tables",
    description:
      "List all tables in the connected SQLite database, including row counts and column information.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "describe_schema",
    description:
      "Get the full schema definition for a specific table, including column names, types, constraints, and indexes.",
    inputSchema: {
      type: "object",
      properties: {
        table: {
          type: "string",
          description: "Name of the table to describe",
        },
      },
      required: ["table"],
    },
  },
  {
    name: "query_table",
    description:
      "Query a table with optional filtering, sorting, and pagination. This is a safe, parameterized query builder.",
    inputSchema: {
      type: "object",
      properties: {
        table: {
          type: "string",
          description: "Name of the table to query",
        },
        columns: {
          type: "string",
          description:
            "Comma-separated list of columns to select (default: all columns)",
        },
        where: {
          type: "string",
          description:
            'WHERE clause conditions (e.g., "age > 25 AND name LIKE \'%john%\'")',
        },
        order_by: {
          type: "string",
          description: 'Column to sort by (e.g., "created_at DESC")',
        },
        limit: {
          type: "string",
          description: "Maximum number of rows to return (default: 50)",
          default: "50",
        },
        offset: {
          type: "string",
          description: "Number of rows to skip (default: 0)",
          default: "0",
        },
      },
      required: ["table"],
    },
  },
  {
    name: "execute_query",
    description:
      "Execute a raw SQL query against the database. By default, only SELECT queries are allowed. Set allow_write=true in server config to enable INSERT/UPDATE/DELETE.",
    inputSchema: {
      type: "object",
      properties: {
        sql: {
          type: "string",
          description: "SQL query to execute",
        },
      },
      required: ["sql"],
    },
  },
];
