// ============================================================
// MCP DevBridge - Database MCP Server
// Provides tools for querying and inspecting SQLite databases.
// Read-only by default; set ALLOW_WRITE=true to enable writes.
// ============================================================

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { BaseMcpServer, McpError } from "../shared/mcp-protocol";
import {
  ToolDefinition,
  ToolResult,
  Resource,
  ResourceContent,
  JSON_RPC_ERRORS,
} from "../shared/types";
import { databaseTools } from "./tools";

class DatabaseMcpServer extends BaseMcpServer {
  private db: Database.Database;
  private dbPath: string;
  private allowWrite: boolean;

  constructor() {
    super(
      "database-server",
      "1.0.0",
      "MCP server for SQLite database operations - query tables, inspect schemas, execute SQL"
    );

    this.dbPath = process.env.DB_PATH || path.join(process.cwd(), "sample.db");
    this.allowWrite = process.env.ALLOW_WRITE === "true";

    // Ensure the directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");

    // Create sample tables if the database is empty
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    const tableCount = this.db
      .prepare(
        "SELECT count(*) as cnt FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      )
      .get() as { cnt: number };

    if (tableCount.cnt === 0) {
      console.log("[database-server] Creating sample data...");

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          language TEXT,
          status TEXT DEFAULT 'active',
          stars INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS developers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL,
          full_name TEXT,
          role TEXT DEFAULT 'developer',
          active INTEGER DEFAULT 1,
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          assignee_id INTEGER,
          title TEXT NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'todo',
          priority TEXT DEFAULT 'medium',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME,
          FOREIGN KEY (project_id) REFERENCES projects(id),
          FOREIGN KEY (assignee_id) REFERENCES developers(id)
        );

        CREATE TABLE IF NOT EXISTS activity_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          developer_id INTEGER,
          project_id INTEGER,
          action TEXT NOT NULL,
          details TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (developer_id) REFERENCES developers(id),
          FOREIGN KEY (project_id) REFERENCES projects(id)
        );

        CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
        CREATE INDEX IF NOT EXISTS idx_activity_developer ON activity_log(developer_id);
        CREATE INDEX IF NOT EXISTS idx_activity_project ON activity_log(project_id);
      `);

      // Insert sample data
      const insertProject = this.db.prepare(
        "INSERT INTO projects (name, description, language, status, stars) VALUES (?, ?, ?, ?, ?)"
      );
      const insertDev = this.db.prepare(
        "INSERT INTO developers (username, email, full_name, role) VALUES (?, ?, ?, ?)"
      );
      const insertTask = this.db.prepare(
        "INSERT INTO tasks (project_id, assignee_id, title, description, status, priority) VALUES (?, ?, ?, ?, ?, ?)"
      );
      const insertActivity = this.db.prepare(
        "INSERT INTO activity_log (developer_id, project_id, action, details) VALUES (?, ?, ?, ?)"
      );

      const projectData = [
        ["MCP DevBridge", "Universal developer tool integration platform", "TypeScript", "active", 142],
        ["DataFlow Engine", "Real-time data pipeline processing engine", "Rust", "active", 89],
        ["CloudSync", "Multi-cloud infrastructure synchronization tool", "Go", "active", 234],
        ["NeuralAPI", "Machine learning model serving framework", "Python", "maintenance", 567],
        ["SecureVault", "Zero-knowledge encryption library", "Rust", "active", 312],
      ];

      const devData = [
        ["jsmith", "john@example.com", "John Smith", "lead"],
        ["agarcia", "anna@example.com", "Anna Garcia", "senior"],
        ["mlee", "mike@example.com", "Mike Lee", "developer"],
        ["sjohnson", "sarah@example.com", "Sarah Johnson", "senior"],
        ["dpatel", "dev@example.com", "Dev Patel", "developer"],
      ];

      const taskData = [
        [1, 1, "Implement MCP protocol handler", "Core JSON-RPC handler for MCP servers", "done", "high"],
        [1, 2, "Build dashboard frontend", "Next.js dashboard with real-time updates", "in_progress", "high"],
        [1, 3, "Add GitHub server tools", "Implement list_repos, create_issue tools", "in_progress", "medium"],
        [2, 4, "Design pipeline DSL", "Create domain-specific language for pipeline definitions", "todo", "high"],
        [2, 5, "Implement Kafka connector", "Add Kafka source/sink connectors", "in_progress", "medium"],
        [3, 1, "AWS provider implementation", "Support AWS EC2, S3, Lambda resources", "done", "high"],
        [3, 2, "Azure provider implementation", "Support Azure VMs, Blob, Functions", "in_progress", "high"],
        [4, 3, "Model versioning system", "Track and manage ML model versions", "done", "high"],
        [4, 4, "A/B testing framework", "Support canary and blue-green deployments", "todo", "medium"],
        [5, 5, "Key rotation mechanism", "Automatic key rotation with zero downtime", "in_progress", "critical"],
      ];

      const activityData = [
        [1, 1, "commit", "Merged PR #42: MCP protocol handler"],
        [2, 1, "review", "Reviewed PR #43: Dashboard layout"],
        [3, 1, "issue", "Created issue #15: Add error handling"],
        [4, 2, "commit", "Added pipeline DSL parser"],
        [5, 3, "deploy", "Deployed v2.1.0 to production"],
        [1, 3, "commit", "Fixed AWS credential rotation bug"],
        [2, 4, "review", "Reviewed PR #89: Model caching layer"],
        [3, 5, "commit", "Implemented AES-256-GCM encryption"],
      ];

      const insertAll = this.db.transaction(() => {
        for (const p of projectData) insertProject.run(...p);
        for (const d of devData) insertDev.run(...d);
        for (const t of taskData) insertTask.run(...t);
        for (const a of activityData) insertActivity.run(...a);
      });
      insertAll();

      console.log("[database-server] Sample data created successfully.");
    }
  }

  async listTools(): Promise<ToolDefinition[]> {
    return databaseTools;
  }

  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    switch (name) {
      case "list_tables":
        return this.listTables();
      case "describe_schema":
        return this.describeSchema(args);
      case "query_table":
        return this.queryTable(args);
      case "execute_query":
        return this.executeQuery(args);
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
        uri: "db://schema",
        name: "Database Schema",
        description: "Complete schema of the connected SQLite database",
        mimeType: "application/json",
      },
      {
        uri: "db://stats",
        name: "Database Statistics",
        description: "Database size, table counts, and row counts",
        mimeType: "application/json",
      },
    ];
  }

  async readResource(uri: string): Promise<ResourceContent> {
    if (uri === "db://schema" || uri === "schema") {
      const tables = this.db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        )
        .all() as Array<{ name: string }>;

      const schema: Record<string, unknown> = {};
      for (const table of tables) {
        const columns = this.db
          .prepare(`PRAGMA table_info(${table.name})`)
          .all();
        const indexes = this.db
          .prepare(`PRAGMA index_list(${table.name})`)
          .all();
        schema[table.name] = { columns, indexes };
      }

      return {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(schema, null, 2),
      };
    }

    if (uri === "db://stats" || uri === "stats") {
      const tables = this.db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        )
        .all() as Array<{ name: string }>;

      const stats: Record<string, unknown> = {
        database_path: this.dbPath,
        allow_write: this.allowWrite,
        tables: {},
      };

      for (const table of tables) {
        const count = this.db
          .prepare(`SELECT count(*) as cnt FROM ${table.name}`)
          .get() as { cnt: number };
        (stats.tables as Record<string, number>)[table.name] = count.cnt;
      }

      return {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(stats, null, 2),
      };
    }

    throw new McpError(
      JSON_RPC_ERRORS.INVALID_PARAMS,
      `Unknown resource: ${uri}`
    );
  }

  // --- Tool Implementations ---

  private async listTables(): Promise<ToolResult> {
    try {
      const tables = this.db
        .prepare(
          "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
        .all() as Array<{ name: string; sql: string }>;

      const tableInfo = tables.map((table) => {
        const count = this.db
          .prepare(`SELECT count(*) as cnt FROM "${table.name}"`)
          .get() as { cnt: number };
        const columns = this.db
          .prepare(`PRAGMA table_info("${table.name}")`)
          .all() as Array<{
          cid: number;
          name: string;
          type: string;
          notnull: number;
          dflt_value: string | null;
          pk: number;
        }>;

        return {
          name: table.name,
          row_count: count.cnt,
          columns: columns.map((col) => ({
            name: col.name,
            type: col.type,
            nullable: !col.notnull,
            primary_key: col.pk > 0,
            default_value: col.dflt_value,
          })),
        };
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                database: this.dbPath,
                table_count: tableInfo.length,
                tables: tableInfo,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error listing tables: ${String(error)}` },
        ],
        isError: true,
      };
    }
  }

  private async describeSchema(
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const tableName = args.table as string;

    if (!tableName) {
      return {
        content: [
          { type: "text", text: "Missing required parameter: 'table'" },
        ],
        isError: true,
      };
    }

    try {
      // Verify table exists
      const exists = this.db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name = ?"
        )
        .get(tableName) as { name: string } | undefined;

      if (!exists) {
        return {
          content: [
            { type: "text", text: `Table '${tableName}' does not exist.` },
          ],
          isError: true,
        };
      }

      const columns = this.db
        .prepare(`PRAGMA table_info("${tableName}")`)
        .all() as Array<{
        cid: number;
        name: string;
        type: string;
        notnull: number;
        dflt_value: string | null;
        pk: number;
      }>;

      const indexes = this.db
        .prepare(`PRAGMA index_list("${tableName}")`)
        .all() as Array<{
        seq: number;
        name: string;
        unique: number;
        origin: string;
      }>;

      const foreignKeys = this.db
        .prepare(`PRAGMA foreign_key_list("${tableName}")`)
        .all() as Array<{
        id: number;
        seq: number;
        table: string;
        from: string;
        to: string;
        on_update: string;
        on_delete: string;
      }>;

      const createSql = this.db
        .prepare(
          "SELECT sql FROM sqlite_master WHERE type='table' AND name = ?"
        )
        .get(tableName) as { sql: string };

      const count = this.db
        .prepare(`SELECT count(*) as cnt FROM "${tableName}"`)
        .get() as { cnt: number };

      const indexDetails = indexes.map((idx) => {
        const idxInfo = this.db
          .prepare(`PRAGMA index_info("${idx.name}")`)
          .all() as Array<{ seqno: number; cid: number; name: string }>;
        return {
          name: idx.name,
          unique: idx.unique === 1,
          columns: idxInfo.map((i) => i.name),
        };
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                table: tableName,
                row_count: count.cnt,
                columns: columns.map((col) => ({
                  name: col.name,
                  type: col.type,
                  nullable: !col.notnull,
                  primary_key: col.pk > 0,
                  default_value: col.dflt_value,
                })),
                indexes: indexDetails,
                foreign_keys: foreignKeys.map((fk) => ({
                  column: fk.from,
                  references_table: fk.table,
                  references_column: fk.to,
                  on_update: fk.on_update,
                  on_delete: fk.on_delete,
                })),
                create_statement: createSql.sql,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error describing schema for '${tableName}': ${String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async queryTable(
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const table = args.table as string;
    const columns = (args.columns as string) || "*";
    const where = args.where as string | undefined;
    const orderBy = args.order_by as string | undefined;
    const limit = parseInt((args.limit as string) || "50", 10);
    const offset = parseInt((args.offset as string) || "0", 10);

    if (!table) {
      return {
        content: [
          { type: "text", text: "Missing required parameter: 'table'" },
        ],
        isError: true,
      };
    }

    try {
      // Verify table exists
      const exists = this.db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name = ?"
        )
        .get(table);

      if (!exists) {
        return {
          content: [
            { type: "text", text: `Table '${table}' does not exist.` },
          ],
          isError: true,
        };
      }

      let sql = `SELECT ${columns} FROM "${table}"`;
      if (where) sql += ` WHERE ${where}`;
      if (orderBy) sql += ` ORDER BY ${orderBy}`;
      sql += ` LIMIT ${Math.min(limit, 1000)} OFFSET ${offset}`;

      const rows = this.db.prepare(sql).all();

      const totalCount = this.db
        .prepare(
          `SELECT count(*) as cnt FROM "${table}"${where ? ` WHERE ${where}` : ""}`
        )
        .get() as { cnt: number };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                table,
                query: sql,
                total_matching: totalCount.cnt,
                returned: rows.length,
                offset,
                rows,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Query error: ${String(error)}` },
        ],
        isError: true,
      };
    }
  }

  private async executeQuery(
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const sql = (args.sql as string || "").trim();

    if (!sql) {
      return {
        content: [
          { type: "text", text: "Missing required parameter: 'sql'" },
        ],
        isError: true,
      };
    }

    // Check if it's a write operation
    const isWrite = /^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\s/i.test(sql);

    if (isWrite && !this.allowWrite) {
      return {
        content: [
          {
            type: "text",
            text: "Write operations are disabled. Set ALLOW_WRITE=true in server configuration to enable INSERT, UPDATE, DELETE, and DDL statements.",
          },
        ],
        isError: true,
      };
    }

    try {
      const isSelect = /^\s*SELECT\s/i.test(sql);

      if (isSelect) {
        const rows = this.db.prepare(sql).all();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  query: sql,
                  row_count: rows.length,
                  rows,
                },
                null,
                2
              ),
            },
          ],
        };
      } else {
        const result = this.db.prepare(sql).run();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  query: sql,
                  changes: result.changes,
                  lastInsertRowid: Number(result.lastInsertRowid),
                },
                null,
                2
              ),
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          { type: "text", text: `SQL execution error: ${String(error)}` },
        ],
        isError: true,
      };
    }
  }
}

// Start the server
const server = new DatabaseMcpServer();
server.start();
