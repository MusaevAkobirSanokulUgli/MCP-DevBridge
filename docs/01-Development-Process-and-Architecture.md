# MCP DevBridge -- Development Process and Architecture

## 1. Executive Summary

MCP DevBridge is a **Universal Developer Tool Integration Platform** that implements the Model Context Protocol (MCP) to provide a standardized, secure, and observable bridge between AI assistants (LLMs) and developer infrastructure such as GitHub, relational databases, and file systems.

### Codebase Metrics

| Metric | Value |
|---|---|
| Total source files | 55 |
| Total lines of code | 8,079 |
| Languages | TypeScript, C# (.NET 8), CSS, JSON, YAML |
| MCP Servers | 3 (GitHub, Database, FileSystem) |
| Backend API endpoints | 15 |
| MCP tools implemented | 13 |
| Frontend pages | 5 |
| Frontend components | 10 |
| Docker services | 5 |

The platform is structured as a three-tier architecture: a **Next.js 14 dashboard** for operator visibility, a **.NET 8 API gateway** for request orchestration and audit logging, and a set of **TypeScript MCP server processes** that expose developer tools over JSON-RPC 2.0.

---

## 2. Problem Statement

### The Fragmentation Problem

Modern software teams rely on dozens of developer tools -- GitHub for source control, SQL databases for data persistence, CI/CD pipelines, file system access, cloud consoles, and more. When AI assistants and LLMs are introduced into development workflows, each integration is typically:

- **Ad-hoc**: Every AI tool vendor writes its own bespoke connector for GitHub, its own database adapter, and its own file system wrapper.
- **Non-standard**: There is no shared protocol, so tool interfaces diverge across providers. A tool invocation in one system looks nothing like the same invocation in another.
- **Unobservable**: Without a unified protocol layer, there is no centralized logging, no consistent health monitoring, and no audit trail of what an AI assistant actually did with a developer's infrastructure.
- **Insecure**: Direct AI-to-tool connections bypass access controls, sandboxing, and rate limiting.

### Why MCP Matters

The **Model Context Protocol (MCP)** addresses this by defining a standard JSON-RPC 2.0-based interface that any AI host can use to discover, invoke, and receive results from developer tools. MCP DevBridge is a reference implementation that demonstrates:

1. How to build **MCP-compliant servers** that wrap real infrastructure (GitHub API, SQLite, file systems).
2. How to build an **MCP host/gateway** that manages server lifecycles, routes tool invocations, and maintains an audit log.
3. How to build an **operator dashboard** for visibility into what tools are available, how they are being used, and whether they are healthy.

---

## 3. Solution Architecture

### System Diagram

```
+------------------------------------------------------------------+
|                        OPERATOR / DEVELOPER                       |
|                    Browser (http://localhost:3000)                 |
+------------------------------------------------------------------+
        |                                                    ^
        | HTTP (REST)                                        | SignalR (WebSocket)
        v                                                    |
+------------------------------------------------------------------+
|                    NEXT.JS 14 FRONTEND (Port 3000)                |
|                                                                    |
|   +------------+  +-----------+  +--------+  +------+  +--------+ |
|   | Dashboard  |  | Servers   |  | Tools  |  | Logs |  |Settings| |
|   | Page       |  | Page      |  | Page   |  | Page |  | Page   | |
|   +------------+  +-----------+  +--------+  +------+  +--------+ |
|                                                                    |
|   +-------------------+  +-------------------+                     |
|   | API Client (fetch)|  | Types (TypeScript)|                     |
|   +-------------------+  +-------------------+                     |
+------------------------------------------------------------------+
        |
        | REST API (JSON)
        v
+------------------------------------------------------------------+
|              .NET 8 API GATEWAY (Port 5000)                       |
|                                                                    |
|   +-----------+  +---------+  +-------+  +--------+               |
|   | Servers   |  | Tools   |  | Logs  |  | Health |               |
|   | Controller|  |Controller| |Controller|Controller|              |
|   +-----------+  +---------+  +-------+  +--------+               |
|         |              |           |          |                    |
|   +---------------------------------------------------+           |
|   |              SERVICE LAYER                         |           |
|   | ServerManagerService | McpProtocolService          |           |
|   | LoggingService       | HealthCheckBackgroundService|           |
|   +---------------------------------------------------+           |
|         |                                                          |
|   +---------------------------------------------------+           |
|   |         DATA LAYER (EF Core + SQLite)              |           |
|   | McpServers | Tools | ToolInvocations | ConnectionLogs         |
|   +---------------------------------------------------+           |
|         |                                                          |
|   +---------------------------------------------------+           |
|   |         REAL-TIME LAYER (SignalR Hub)               |           |
|   | DashboardHub: ServerEvent, ConnectionEvent,         |           |
|   |               ToolInvocationComplete                |           |
|   +---------------------------------------------------+           |
+------------------------------------------------------------------+
        |
        | JSON-RPC 2.0 over HTTP (POST /rpc)
        v
+------------------------------------------------------------------+
|                    MCP SERVER LAYER                                |
|                                                                    |
|  +------------------+  +------------------+  +------------------+  |
|  | GitHub Server    |  | Database Server  |  | FileSystem Server|  |
|  | Port 3001        |  | Port 3002        |  | Port 3003        |  |
|  |                  |  |                  |  |                  |  |
|  | Tools:           |  | Tools:           |  | Tools:           |  |
|  | - list_repos     |  | - list_tables    |  | - list_files     |  |
|  | - get_repo       |  | - describe_schema|  | - read_file      |  |
|  | - create_issue   |  | - query_table    |  | - write_file     |  |
|  | - list_issues    |  | - execute_query  |  | - search_files   |  |
|  | - get_pull_reqs  |  |                  |  |                  |  |
|  |                  |  | Resources:       |  | Resources:       |  |
|  | Resources:       |  | - db://schema    |  | - fs://info      |  |
|  | - github://status|  | - db://stats     |  |                  |  |
|  +------------------+  +------------------+  +------------------+  |
|                                                                    |
|  +--------------------------------------------------------------+  |
|  |                SHARED: BaseMcpServer                          |  |
|  |  Abstract class providing JSON-RPC 2.0 transport,             |  |
|  |  request dispatching, tool invocation logging,                |  |
|  |  REST convenience endpoints, health checks                   |  |
|  +--------------------------------------------------------------+  |
+------------------------------------------------------------------+
        |                    |                    |
        v                    v                    v
   GitHub REST API      SQLite (better-sqlite3)   Local File System
                                                  (sandboxed)
```

### Multi-Layer Architecture

| Layer | Responsibility | Technology |
|---|---|---|
| **Presentation** | Operator dashboard, dark mode UI, real-time updates | Next.js 14, Tailwind CSS, SignalR client |
| **API Gateway** | Request routing, authentication surface, audit logging | .NET 8 Web API, EF Core, SignalR Hub |
| **Protocol Bridge** | JSON-RPC 2.0 serialization, error mapping, timeout handling | McpProtocolService (HttpClient) |
| **MCP Servers** | Tool implementation, resource exposure, invocation logging | TypeScript, Express, BaseMcpServer |
| **Infrastructure** | External APIs, databases, file systems | GitHub REST API, SQLite, OS file system |
| **Containerization** | Service orchestration, networking, volume management | Docker, Docker Compose |

---

## 4. Technology Stack

### Complete Technology Inventory

| Technology | Version | Layer | Purpose |
|---|---|---|---|
| **Next.js** | 14.2.21 | Frontend | App Router, SSR, API rewrites |
| **React** | ^18.3.1 | Frontend | UI component framework |
| **TypeScript** | ^5.7.2 | Frontend + MCP | Static typing across all TS layers |
| **Tailwind CSS** | ^3.4.16 | Frontend | Utility-first CSS framework |
| **lucide-react** | ^0.468.0 | Frontend | Icon library |
| **clsx** | ^2.1.1 | Frontend | Conditional CSS class composition |
| **tailwind-merge** | ^2.6.0 | Frontend | Tailwind class deduplication |
| **@microsoft/signalr** | ^8.0.7 | Frontend | Real-time WebSocket client |
| **PostCSS** | ^8.4.49 | Frontend | CSS processing pipeline |
| **Autoprefixer** | ^10.4.20 | Frontend | CSS vendor prefixing |
| **.NET** | 8.0 | Backend | Web API framework |
| **Entity Framework Core** | 8.0.11 | Backend | ORM and database migrations |
| **EF Core SQLite** | 8.0.11 | Backend | SQLite database provider |
| **ASP.NET Core SignalR** | 8.0.11 | Backend | Real-time hub |
| **Swashbuckle** | 6.9.0 | Backend | Swagger/OpenAPI generation |
| **Express** | ^4.21.1 | MCP Servers | HTTP server framework |
| **cors** | ^2.8.5 | MCP Servers | Cross-origin resource sharing |
| **uuid** | ^11.0.3 | MCP Servers | Unique invocation ID generation |
| **octokit** | ^4.1.0 | MCP Servers (GitHub) | GitHub REST API client |
| **better-sqlite3** | ^11.7.0 | MCP Servers (Database) | Synchronous SQLite driver |
| **glob** | ^11.0.0 | MCP Servers (FileSystem) | File pattern matching |
| **mime-types** | ^2.1.35 | MCP Servers (FileSystem) | MIME type detection |
| **zod** | ^3.24.1 | MCP Servers | Schema validation (available) |
| **tsx** | ^4.19.2 | MCP Servers (dev) | TypeScript execution without build step |
| **Node.js** | 20 (Alpine) | MCP Servers + Frontend | JavaScript runtime |
| **Docker** | -- | Infrastructure | Container runtime |
| **Docker Compose** | 3.8 | Infrastructure | Multi-container orchestration |
| **SQLite** | -- | Backend + MCP (Database) | Embedded relational database |

---

## 5. System Design

### Service Communication Patterns

The system uses two distinct communication patterns:

**1. Frontend-to-Backend: REST over HTTP**

The Next.js frontend communicates with the .NET backend exclusively through a centralized `ApiClient` class (`frontend/src/lib/api.ts`). API rewrites in `next.config.js` proxy `/api/*` requests to the backend when running in development mode.

```
Frontend (fetch) --> [REST JSON] --> .NET API Controllers
```

**2. Backend-to-MCP Servers: JSON-RPC 2.0 over HTTP**

The .NET backend communicates with MCP servers using the JSON-RPC 2.0 protocol, implemented in `McpProtocolService`. Each request follows the standard format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "list_repos",
    "arguments": { "owner": "microsoft" }
  }
}
```

The response follows the JSON-RPC 2.0 success/error envelope:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{ "type": "text", "text": "{...}" }],
    "isError": false
  }
}
```

**3. Backend-to-Frontend: SignalR (WebSocket)**

Real-time events (server status changes, tool invocation completions) are pushed from the backend to the frontend via the `DashboardHub` SignalR hub at `/hubs/dashboard`. The hub supports three event types:

| Event | Payload | Triggered By |
|---|---|---|
| `ServerEvent` | `{ type, serverName, timestamp }` | Server lifecycle changes |
| `ConnectionEvent` | `{ id, serverId, serverName, event, message, details, timestamp }` | Connection state changes |
| `ToolInvocationComplete` | `{ id, serverId, serverName, toolName, status, durationMs, timestamp }` | Tool call completion |

### Request Routing

When a tool invocation request arrives at the backend:

1. `ToolsController.Invoke` receives the `ToolInvokeDto` with `serverId`, `toolName`, and `arguments`.
2. The controller looks up the server in the database and verifies its status is `"active"`.
3. `LoggingService.LogToolInvocationAsync` creates a pending invocation record.
4. `McpProtocolService.CallToolAsync` constructs a JSON-RPC 2.0 request and sends it to `{server.Endpoint}/rpc`.
5. The response is parsed, the invocation record is completed, and a SignalR notification is broadcast.
6. The HTTP response is returned to the caller.

### Error Handling Strategy

Errors are handled at three levels:

**MCP Server Level** -- The `BaseMcpServer.handleJsonRpc` method catches errors and wraps them in JSON-RPC 2.0 error responses. A custom `McpError` class carries structured error codes from the JSON-RPC standard:

| Code | Constant | Meaning |
|---|---|---|
| -32700 | `PARSE_ERROR` | Invalid JSON |
| -32600 | `INVALID_REQUEST` | Not a valid JSON-RPC 2.0 request |
| -32601 | `METHOD_NOT_FOUND` | Unknown method |
| -32602 | `INVALID_PARAMS` | Missing or invalid parameters |
| -32603 | `INTERNAL_ERROR` | Server-side error |

**Backend Level** -- The `McpProtocolService` catches `HttpRequestException` (connection failures), `TaskCanceledException` (timeouts), and JSON-RPC error responses, wrapping them in `McpProtocolException` with custom codes:

| Code | Meaning |
|---|---|
| -32000 | Connection failure |
| -32001 | Timeout |
| -32603 | Unexpected error |

**Controller Level** -- Each controller method returns appropriate HTTP status codes:

| Status | Meaning |
|---|---|
| 200 | Success |
| 201 | Created (new server) |
| 204 | No content (deletion) |
| 400 | Bad request / validation error |
| 404 | Resource not found |
| 500 | Internal server error |
| 502 | Bad gateway (MCP protocol error) |

---

## 6. MCP Protocol Implementation

### BaseMcpServer Abstract Class

The core of the MCP protocol implementation lives in `mcp-servers/shared/mcp-protocol.ts`. The `BaseMcpServer` abstract class provides:

1. **Express HTTP server** with CORS and JSON body parsing (10MB limit).
2. **JSON-RPC 2.0 endpoint** at `POST /rpc` with full request validation and method dispatching.
3. **REST convenience endpoints** for health checks, server info, tool listing, tool invocation, and resource reading.
4. **Invocation logging** with UUID-based tracking, duration measurement, and bounded in-memory storage (max 1000 entries, pruned to 500).

Subclasses must implement four abstract methods:

```typescript
abstract listTools(): Promise<ToolDefinition[]>;
abstract callTool(name: string, args: Record<string, unknown>): Promise<ToolResult>;
abstract listResources(): Promise<Resource[]>;
abstract readResource(uri: string): Promise<ResourceContent>;
```

### Protocol Flow

A complete MCP interaction follows this sequence:

```
Client                          MCP Server
  |                                  |
  |--- initialize ------------------>|
  |<-- { name, version, caps } ------|
  |                                  |
  |--- tools/list ------------------>|
  |<-- { tools: [...] } -------------|
  |                                  |
  |--- tools/call ------------------>|
  |    { name, arguments }           |
  |<-- { content, isError } ---------|
  |                                  |
  |--- resources/list -------------->|
  |<-- { resources: [...] } ---------|
  |                                  |
  |--- resources/read -------------->|
  |    { uri }                       |
  |<-- { uri, mimeType, text } ------|
```

### Method Dispatching

The `dispatchMethod` function in `BaseMcpServer` maps JSON-RPC method names to handler functions:

| JSON-RPC Method | Handler | Returns |
|---|---|---|
| `initialize` | `this.initialize()` | `ServerCapabilities` |
| `tools/list` | `this.listTools()` | `{ tools: ToolDefinition[] }` |
| `tools/call` | `this.executeToolWithLogging(name, args)` | `ToolResult` |
| `resources/list` | `this.listResources()` | `{ resources: Resource[] }` |
| `resources/read` | `this.readResource(uri)` | `ResourceContent` |

### Tool Invocation Logging

Every tool call passes through `executeToolWithLogging`, which:

1. Records the start timestamp and generates a UUID for the invocation.
2. Calls the concrete `callTool` implementation.
3. Measures execution duration.
4. Pushes the result to the in-memory `invocationLog` array.
5. Prunes the log when it exceeds 1000 entries.
6. Logs to the console with the format: `[server-name] Tool call: tool_name (Xms) - OK/ERROR`.

### REST Convenience Endpoints

In addition to the JSON-RPC endpoint, each MCP server exposes:

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Health check (returns `{ status, server, version, timestamp }`) |
| GET | `/info` | Full server info (capabilities + tools + resources) |
| GET | `/tools` | List all tools |
| POST | `/tools/:toolName` | Invoke a tool by name (body = arguments) |
| GET | `/resources` | List all resources |
| GET | `/resources/*` | Read a resource by URI |
| GET | `/invocations` | Last 100 invocation log entries |

---

## 7. MCP Server Development

### 7.1 GitHub Server (Port 3001)

**Purpose**: Provides MCP tools for interacting with GitHub repositories, issues, and pull requests via the GitHub REST API.

**Library**: `octokit` v4.1.0

**Authentication**: Optional `GITHUB_TOKEN` environment variable. Without a token, only public endpoints work.

#### Tools

| Tool | Required Params | Optional Params | Description |
|---|---|---|---|
| `list_repos` | -- | `owner`, `type`, `sort`, `per_page` | List repositories for authenticated user or specified owner |
| `get_repo` | `owner`, `repo` | -- | Get detailed repository information (stars, forks, topics, license) |
| `create_issue` | `owner`, `repo`, `title` | `body`, `labels`, `assignees` | Create an issue with optional labels and assignees (requires token) |
| `list_issues` | `owner`, `repo` | `state`, `labels`, `assignee`, `per_page` | List issues with filtering; automatically filters out pull requests |
| `get_pull_requests` | `owner`, `repo` | `state`, `sort`, `direction`, `per_page` | List pull requests with sorting and filtering |

#### Resources

| URI | Description |
|---|---|
| `github://status` | GitHub API connection status and rate limit information |

#### Security

- Graceful degradation when no token is provided -- returns informative error messages.
- Per-page limits capped at 100 (GitHub API maximum).
- No write operations other than `create_issue`, which requires explicit authentication.

---

### 7.2 Database Server (Port 3002)

**Purpose**: Provides MCP tools for querying and inspecting SQLite databases with a read-only-by-default security posture.

**Library**: `better-sqlite3` v11.7.0

**Configuration**:
- `DB_PATH`: Path to the SQLite database file (default: `sample.db`).
- `ALLOW_WRITE`: Set to `"true"` to enable INSERT/UPDATE/DELETE/DDL (default: `"false"`).

#### Auto-Generated Sample Data

When the database file is empty, the server automatically creates four tables with sample data:

**projects** (5 rows)

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| name | TEXT | NOT NULL |
| description | TEXT | -- |
| language | TEXT | -- |
| status | TEXT | DEFAULT 'active' |
| stars | INTEGER | DEFAULT 0 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

**developers** (5 rows)

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| username | TEXT | NOT NULL, UNIQUE |
| email | TEXT | NOT NULL |
| full_name | TEXT | -- |
| role | TEXT | DEFAULT 'developer' |
| active | INTEGER | DEFAULT 1 |
| joined_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

**tasks** (10 rows)

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| project_id | INTEGER | NOT NULL, FK -> projects(id) |
| assignee_id | INTEGER | FK -> developers(id) |
| title | TEXT | NOT NULL |
| description | TEXT | -- |
| status | TEXT | DEFAULT 'todo' |
| priority | TEXT | DEFAULT 'medium' |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| completed_at | DATETIME | -- |

**activity_log** (8 rows)

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| developer_id | INTEGER | FK -> developers(id) |
| project_id | INTEGER | FK -> projects(id) |
| action | TEXT | NOT NULL |
| details | TEXT | -- |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

**Indexes**: `idx_tasks_project`, `idx_tasks_assignee`, `idx_tasks_status`, `idx_activity_developer`, `idx_activity_project`

**Database pragmas**: `journal_mode = WAL`, `foreign_keys = ON`

#### Tools

| Tool | Required Params | Optional Params | Description |
|---|---|---|---|
| `list_tables` | -- | -- | List all tables with row counts and column metadata |
| `describe_schema` | `table` | -- | Full schema: columns, types, constraints, indexes, foreign keys, CREATE statement |
| `query_table` | `table` | `columns`, `where`, `order_by`, `limit`, `offset` | Safe parameterized query builder (limit capped at 1000) |
| `execute_query` | `sql` | -- | Raw SQL execution; write ops blocked unless `ALLOW_WRITE=true` |

#### Resources

| URI | Description |
|---|---|
| `db://schema` | Complete database schema (all tables, columns, indexes) |
| `db://stats` | Database statistics (path, write mode, table row counts) |

#### Security

- **Read-only by default**: Write operations (INSERT, UPDATE, DELETE, DROP, ALTER, CREATE) are rejected with an informative error unless `ALLOW_WRITE=true`.
- **Regex-based write detection**: `^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\s` pattern.
- **Query limits**: `query_table` caps results at 1000 rows.
- **WAL mode**: Enables concurrent reads without blocking.

---

### 7.3 FileSystem Server (Port 3003)

**Purpose**: Provides sandboxed file system operations for listing, reading, writing, and searching files within a configured directory.

**Libraries**: `glob` v11.0.0, `mime-types` v2.1.35

**Configuration**: `SANDBOX_DIR` environment variable (default: `./sandbox`).

#### Sandbox Initialization

When the sandbox directory is empty, the server creates a sample project structure with files including `README.md`, `package.json`, `src/index.ts`, `src/components/Button.tsx`, `src/utils/helpers.ts`, `config/app.json`, `docs/architecture.md`, and `tests/helpers.test.ts`.

#### Tools

| Tool | Required Params | Optional Params | Description |
|---|---|---|---|
| `list_files` | -- | `path`, `recursive`, `pattern` | List files and directories with size, type, MIME type, timestamps |
| `read_file` | `path` | `start_line`, `end_line`, `encoding` | Read file contents with optional line range (5MB limit) |
| `write_file` | `path`, `content` | `append` | Write or append to files; auto-creates parent directories |
| `search_files` | `pattern` | `path`, `file_pattern`, `case_sensitive`, `max_results` | Regex search across files with line/column reporting |

#### Resources

| URI | Description |
|---|---|
| `fs://info` | Sandbox directory path and total file count |

#### Security

- **Directory traversal prevention**: The `resolveSafePath` method resolves the user-provided path within the sandbox and verifies the resolved path starts with the sandbox directory. If a path like `../../etc/passwd` is provided, it is rejected.
- **File size limits**: `read_file` rejects files larger than 5MB. `search_files` skips files larger than 1MB.
- **Sandboxing**: All operations are confined to the configured `SANDBOX_DIR`.

```typescript
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
```

---

## 8. Backend Development (.NET 8)

### Project Structure

```
backend/
  McpDevBridge.sln
  McpDevBridge.Api/
    Program.cs                    # Entry point, DI configuration, middleware pipeline
    McpDevBridge.Api.csproj       # Project file with NuGet references
    appsettings.json              # Configuration (connection strings, CORS, server endpoints)
    Dockerfile                    # Multi-stage Docker build
    Controllers/
      ServersController.cs        # CRUD + lifecycle for MCP servers
      ToolsController.cs          # Tool registry + invocation
      LogsController.cs           # Connection + invocation log queries
      HealthController.cs         # System health + dashboard stats
    Models/
      McpServer.cs                # Entity + DTOs (Create, Update, Response)
      Tool.cs                     # Entity + DTOs (Response, Invoke, InvokeResponse)
      ToolInvocation.cs           # Entity + DTO (Response)
      ConnectionLog.cs            # Entity + DTOs (Response, QueryParams)
    Services/
      McpProtocolService.cs       # JSON-RPC 2.0 client + custom exception
      ServerManagerService.cs     # Server lifecycle, health checks, tool sync
      LoggingService.cs           # Audit logging + SignalR notifications
    Hubs/
      DashboardHub.cs             # SignalR hub for real-time events
    Data/
      AppDbContext.cs              # EF Core context + seed data
```

### Controllers

#### ServersController (`/api/servers`)

| Method | Route | Action |
|---|---|---|
| GET | `/api/servers` | Get all registered MCP servers |
| GET | `/api/servers/{id}` | Get a specific server by ID |
| POST | `/api/servers` | Register a new server (validates type: github/database/filesystem) |
| PUT | `/api/servers/{id}` | Update server configuration |
| DELETE | `/api/servers/{id}` | Delete server and cascade to tools/invocations/logs |
| POST | `/api/servers/{id}/start` | Health check + set active + sync tools |
| POST | `/api/servers/{id}/stop` | Set inactive + log disconnection |
| POST | `/api/servers/{id}/refresh-tools` | Re-sync tool registry from remote server |

#### ToolsController (`/api/tools`)

| Method | Route | Action |
|---|---|---|
| GET | `/api/tools` | List all tools (filterable by `serverId` and `serverType`) |
| GET | `/api/tools/{id}` | Get a specific tool by ID |
| POST | `/api/tools/invoke` | Invoke a tool on a server via JSON-RPC 2.0 |
| GET | `/api/tools/invocations` | Query tool invocation history (paginated) |

#### LogsController (`/api/logs`)

| Method | Route | Action |
|---|---|---|
| GET | `/api/logs/connections` | Query connection logs (filterable by serverId, eventType, date range) |
| GET | `/api/logs/invocations` | Query invocation logs (filterable by serverId) |
| GET | `/api/logs/summary` | Aggregated statistics (total invocations, errors last hour, errors 24h) |

#### HealthController (`/api/health`)

| Method | Route | Action |
|---|---|---|
| GET | `/api/health` | System health (status, uptime, active/total servers, recent errors) |
| GET | `/api/health/dashboard` | Dashboard stats (connections, tool calls, tools, error rate, activity) |
| POST | `/api/health/check` | Trigger health checks for all servers |

### Services

**McpProtocolService** -- HTTP client for JSON-RPC 2.0 communication with MCP servers. Key features:
- 30-second timeout per request.
- Thread-safe request ID generation via `Interlocked.Increment`.
- Explicit handling of JSON-RPC error responses, HTTP errors, and timeouts.

**ServerManagerService** -- Manages the full server lifecycle:
- `StartServerAsync`: Checks health, sets status, syncs tools.
- `StopServerAsync`: Sets status to inactive, logs disconnection.
- `RefreshServerToolsAsync`: Fetches remote tool list, adds new tools, updates existing, marks removed as disabled.
- `PerformHealthChecksAsync`: Iterates all non-inactive servers, updates status, logs state transitions.
- Broadcasts SignalR notifications on every state change.

**LoggingService** -- Manages the audit trail:
- `LogConnectionEventAsync`: Records connection events and broadcasts via SignalR.
- `LogToolInvocationAsync` / `CompleteToolInvocationAsync`: Two-phase invocation logging (pending -> success/error).
- `GetConnectionLogsAsync`: Paginated, filterable query with server/event/date-range filters.
- `GetToolInvocationsAsync`: Paginated invocation history.
- `GetTotalInvocationCountAsync` / `GetErrorCountAsync`: Aggregate statistics.

**HealthCheckBackgroundService** -- A `BackgroundService` that runs health checks every 30 seconds (after a 10-second startup delay).

### SignalR Hub

The `DashboardHub` provides:
- `OnConnectedAsync`: Sends a welcome message to the connecting client.
- `SubscribeToServer(serverId)`: Adds the client to a server-specific group.
- `UnsubscribeFromServer(serverId)`: Removes the client from a server group.
- `Ping`: Connectivity verification.

### Seed Data

The `AppDbContext.SeedData` method provides initial data:
- 3 MCP servers (GitHub, Database, FileSystem) with pre-configured endpoints.
- 14 tools (5 GitHub, 4 Database, 4 FileSystem + 1 extra GitHub) with JSON input schemas.
- 6 connection log entries (3 connections, 3 tool calls).
- 5 tool invocation records with sample inputs/outputs and durations.

---

## 9. Frontend Development (Next.js)

### Application Structure

```
frontend/src/
  app/
    layout.tsx        # Root layout with Sidebar + Header
    page.tsx          # Dashboard (polling every 15s)
    servers/page.tsx  # Server management
    tools/page.tsx    # Tool registry + invocation
    logs/page.tsx     # Activity logs with tabs and pagination
    settings/page.tsx # Configuration + health status
  components/
    layout/
      Sidebar.tsx     # Fixed left sidebar with navigation
      Header.tsx      # Top bar with health indicator + dark mode toggle
    dashboard/
      StatsCards.tsx   # 4-card grid (connections, tool calls, tools, error rate)
      ServerStatus.tsx # Server list with status badges
      ActivityFeed.tsx # Recent tool invocation timeline
    servers/
      ServerCard.tsx   # Server details with start/stop/refresh/delete actions
      ServerForm.tsx   # Modal form for registering new servers
    tools/
      ToolCard.tsx     # Tool summary card with type badge and parameter count
      ToolInvoker.tsx  # Modal for building and executing tool invocations
    logs/
      LogTable.tsx     # Tabular view for connection events and invocations
  lib/
    api.ts            # Centralized ApiClient class (fetch-based)
    types.ts          # TypeScript interfaces matching backend DTOs
  styles/
    globals.css       # Tailwind directives, CSS custom properties, dark theme
```

### Pages

| Page | Route | Key Features |
|---|---|---|
| Dashboard | `/` | StatsCards, ServerStatus, ActivityFeed, 15s auto-refresh, architecture info |
| Servers | `/servers` | Server grid, Add Server modal, Start/Stop/Refresh/Delete, loading skeletons |
| Tools | `/tools` | Search + filter by server type, grouped by server, ToolInvoker modal |
| Logs | `/logs` | Tabs (Connections / Invocations), summary cards, pagination |
| Settings | `/settings` | API URL, GitHub token, DB path, sandbox dir, health check config, system health |

### API Client

The `ApiClient` class in `api.ts` provides a typed, centralized interface:
- Automatic `Content-Type: application/json` headers.
- Structured error handling via `ApiError` class.
- 204 No Content handling for DELETE operations.
- Base URL configured via `NEXT_PUBLIC_API_URL` (default: `http://localhost:5000`).

### Dark Mode

Dark mode is the default. The `<html>` element gets `className="dark"` in `layout.tsx`. The `Header` component provides a toggle button that calls `document.documentElement.classList.toggle("dark")`. CSS custom properties in `globals.css` define both light and dark color schemes using HSL values.

### Responsive Design

The layout uses Tailwind CSS responsive breakpoints:
- Sidebar: Fixed 64px width, visible on all screens.
- Dashboard cards: 1 column (mobile) -> 2 columns (sm) -> 4 columns (lg).
- Server grid: 1 column -> 2 columns (lg).
- Tool grid: 1 column -> 2 columns (md) -> 3 columns (lg).
- Log summary cards: 1 column -> 3 columns (sm).

---

## 10. Database Schema

### Backend SQLite Database (`devbridge.db`)

#### McpServers

| Column | Type | Constraints |
|---|---|---|
| Id | TEXT | PRIMARY KEY (GUID string) |
| Name | TEXT | REQUIRED, MAX 100, UNIQUE INDEX |
| Type | TEXT | REQUIRED, MAX 50, INDEXED |
| Endpoint | TEXT | REQUIRED, MAX 500 |
| Status | TEXT | MAX 20, DEFAULT "inactive", INDEXED |
| Description | TEXT | MAX 500 |
| Configuration | TEXT | JSON string, DEFAULT "{}" |
| CreatedAt | DATETIME | DEFAULT UTC NOW |
| UpdatedAt | DATETIME | DEFAULT UTC NOW |

#### Tools

| Column | Type | Constraints |
|---|---|---|
| Id | TEXT | PRIMARY KEY (GUID string) |
| ServerId | TEXT | REQUIRED, FK -> McpServers(Id) CASCADE |
| Name | TEXT | REQUIRED, MAX 100 |
| Description | TEXT | MAX 1000 |
| InputSchema | TEXT | JSON string, DEFAULT "{}" |
| Enabled | INTEGER | DEFAULT true |
| CreatedAt | DATETIME | DEFAULT UTC NOW |

**Unique Index**: `(ServerId, Name)`

#### ToolInvocations

| Column | Type | Constraints |
|---|---|---|
| Id | TEXT | PRIMARY KEY (GUID string) |
| ServerId | TEXT | REQUIRED, FK -> McpServers(Id) CASCADE, INDEXED |
| ToolName | TEXT | REQUIRED, MAX 100 |
| Input | TEXT | JSON string, DEFAULT "{}" |
| Output | TEXT | JSON string, DEFAULT "{}" |
| Status | TEXT | MAX 20, DEFAULT "pending", INDEXED |
| DurationMs | INTEGER | Duration in milliseconds |
| Timestamp | DATETIME | DEFAULT UTC NOW, INDEXED |

#### ConnectionLogs

| Column | Type | Constraints |
|---|---|---|
| Id | TEXT | PRIMARY KEY (GUID string) |
| ServerId | TEXT | REQUIRED, FK -> McpServers(Id) CASCADE, INDEXED |
| Event | TEXT | REQUIRED, MAX 30, INDEXED |
| Message | TEXT | MAX 500 |
| Details | TEXT | Nullable JSON string |
| Timestamp | DATETIME | DEFAULT UTC NOW, INDEXED |

### Entity Relationships

```
McpServers (1) ----< (N) Tools
McpServers (1) ----< (N) ToolInvocations
McpServers (1) ----< (N) ConnectionLogs
```

All child entities cascade on delete when the parent server is removed.

---

## 11. Infrastructure

### Docker Compose Configuration

The `docker-compose.yml` defines 5 services on a shared `devbridge` bridge network:

| Service | Build Context | Port | Depends On |
|---|---|---|---|
| `frontend` | `./frontend` | 3000:3000 | backend |
| `backend` | `./backend` (Dockerfile in `McpDevBridge.Api/`) | 5000:5000 | github-server, database-server, filesystem-server |
| `github-server` | `./mcp-servers` (ARG: github-server) | 3001:3001 | -- |
| `database-server` | `./mcp-servers` (ARG: database-server) | 3002:3002 | -- |
| `filesystem-server` | `./mcp-servers` (ARG: filesystem-server) | 3003:3003 | -- |

### Volumes

| Volume | Mounted To | Used By |
|---|---|---|
| `db-data` | `/data` | backend, database-server |
| `sandbox-data` | `/sandbox` | filesystem-server |

### Dockerfiles

**MCP Servers** (`mcp-servers/Dockerfile`): Single-stage Node.js 20 Alpine build. Uses a build `ARG SERVER_NAME` to selectively copy and build only the relevant server directory. Compiles TypeScript with `npx tsc`.

**Backend** (`backend/McpDevBridge.Api/Dockerfile`): Multi-stage .NET 8 build:
1. SDK stage: `dotnet restore` + `dotnet publish -c Release`.
2. Runtime stage: ASP.NET 8 runtime image, exposes port 5000.

**Frontend** (`frontend/Dockerfile`): Multi-stage Node.js 20 Alpine build:
1. Builder stage: `npm install` + `npm run build`.
2. Runner stage: Copies standalone output, static assets, and `next.config.js`. Runs `node server.js`.

### Networking

All services communicate over the `devbridge` bridge network. Internal service names (e.g., `github-server`, `backend`) serve as DNS hostnames. The backend's environment variables map MCP server names to internal hostnames:

```yaml
McpServers__GitHubServer=http://github-server:3001
McpServers__DatabaseServer=http://database-server:3002
McpServers__FileSystemServer=http://filesystem-server:3003
```

---

## 12. Security Considerations

### Currently Implemented

| Area | Implementation |
|---|---|
| **File system sandboxing** | `resolveSafePath` prevents directory traversal attacks |
| **Database write protection** | Read-only by default; requires explicit `ALLOW_WRITE=true` |
| **File size limits** | 5MB read limit, 1MB search limit |
| **Query result limits** | Capped at 1000 rows per query |
| **CORS** | Configured with specific allowed origins |
| **Input validation** | Required field checks, type validation on server creation |
| **Error isolation** | MCP errors do not leak stack traces (wrapped in JSON-RPC errors) |
| **Invocation logging** | Complete audit trail of all tool calls |
| **Health monitoring** | Background health checks every 30 seconds |

### Needs Production Hardening

| Area | Current State | Production Requirement |
|---|---|---|
| **Authentication** | None | JWT/OAuth2 for API access |
| **Authorization** | None | RBAC for server management and tool invocation |
| **Rate limiting** | None | Per-client request throttling |
| **TLS/SSL** | HTTP only | HTTPS with valid certificates |
| **Secret management** | Environment variables | Vault/Key Management Service |
| **Database** | SQLite (single-file) | PostgreSQL or similar for concurrent writes |
| **CORS** | Allows localhost | Restrict to production domains |
| **Input sanitization** | Basic | SQL injection protection for `execute_query` tool |
| **Logging** | Console + SQLite | Structured logging with ELK/Datadog |
| **Container security** | Root user | Non-root user, read-only file systems |
| **Network policies** | Open bridge network | Service mesh, mutual TLS |

### SQL Injection Note

The `execute_query` tool in the Database Server accepts raw SQL strings. While the `ALLOW_WRITE` flag prevents data modification by default, a production deployment should additionally:
- Whitelist allowed table names.
- Use parameterized queries wherever possible.
- Implement query complexity analysis.
- Set per-query execution timeouts.
