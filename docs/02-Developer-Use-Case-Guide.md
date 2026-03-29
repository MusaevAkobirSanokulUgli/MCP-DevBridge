# MCP DevBridge -- Developer Use Case Guide

## 1. Quick Start Guide

### Prerequisites

| Requirement | Minimum Version | Check Command |
|---|---|---|
| Node.js | 20+ | `node --version` |
| npm | 10+ | `npm --version` |
| .NET SDK | 8.0+ | `dotnet --version` |
| Docker (optional) | 24+ | `docker --version` |
| Docker Compose (optional) | 2.20+ | `docker compose version` |

### One-Command Launch (Docker)

```bash
cd project-1-mcp-devbridge
docker-compose up --build
```

This builds and starts all 5 services. After the build completes:

| Service | URL |
|---|---|
| Dashboard | http://localhost:3000 |
| API Gateway | http://localhost:5000 |
| Swagger Docs | http://localhost:5000/swagger |
| GitHub MCP Server | http://localhost:3001 |
| Database MCP Server | http://localhost:3002 |
| FileSystem MCP Server | http://localhost:3003 |

### First Run Notes

1. The **Database MCP Server** automatically creates a `sample.db` file with 4 tables and seed data (projects, developers, tasks, activity_log) on first run.
2. The **FileSystem MCP Server** creates a `sandbox/` directory with sample project files on first run.
3. The **GitHub MCP Server** works without a token for public repository operations. Set `GITHUB_TOKEN` for authenticated access.
4. The **.NET backend** runs `EnsureCreated()` on startup, which creates the `devbridge.db` SQLite file with seed data (3 servers, 14 tools, 6 logs, 5 invocations).
5. The **background health check** starts 10 seconds after backend launch and runs every 30 seconds.

---

## 2. Local Development Setup

### Layer 1: MCP Servers (TypeScript)

```bash
cd project-1-mcp-devbridge/mcp-servers
npm install
```

Start each server in a separate terminal:

```bash
# Terminal 1: GitHub Server
PORT=3001 npx tsx github-server/index.ts

# Terminal 2: Database Server
PORT=3002 npx tsx database-server/index.ts

# Terminal 3: FileSystem Server
PORT=3003 npx tsx filesystem-server/index.ts
```

Optional environment variables:

```bash
# GitHub Server: Enable authenticated access
GITHUB_TOKEN=ghp_your_token_here PORT=3001 npx tsx github-server/index.ts

# Database Server: Enable write operations
ALLOW_WRITE=true DB_PATH=./mydata.db PORT=3002 npx tsx database-server/index.ts

# FileSystem Server: Custom sandbox directory
SANDBOX_DIR=/path/to/sandbox PORT=3003 npx tsx filesystem-server/index.ts
```

### Layer 2: .NET Backend

```bash
cd project-1-mcp-devbridge/backend/McpDevBridge.Api
dotnet restore
dotnet run
```

The backend starts at `http://localhost:5000` with Swagger UI at `http://localhost:5000/swagger`.

To change the port or environment:

```bash
ASPNETCORE_URLS=http://+:5000 ASPNETCORE_ENVIRONMENT=Development dotnet run
```

### Layer 3: Next.js Frontend

```bash
cd project-1-mcp-devbridge/frontend
npm install
npm run dev
```

The frontend starts at `http://localhost:3000`. To point it at a different backend:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000 npm run dev
```

---

## 3. Running the Project

### Step-by-Step Workflow

1. **Start MCP servers** (all three terminals must be running).
2. **Start the .NET backend** -- it seeds the database and begins health checks.
3. **Start the Next.js frontend** -- opens the dashboard.
4. **Navigate to Servers page** -- the 3 seeded servers should appear.
5. **Click "Start"** on each server -- the backend performs a health check and syncs tools.
6. **Navigate to Tools page** -- all 13 tools should appear grouped by server.
7. **Click on a tool** -- the ToolInvoker modal opens with parameter fields.
8. **Fill in parameters and click "Invoke Tool"** -- the result appears with duration.
9. **Navigate to Logs page** -- see connection events and tool invocations.

### Testing MCP Servers Directly

Each MCP server can be tested independently without the backend:

```bash
# Health check
curl http://localhost:3001/health

# Server info (capabilities, tools, resources)
curl http://localhost:3001/info

# List tools
curl http://localhost:3001/tools

# Invoke a tool via REST
curl -X POST http://localhost:3001/tools/list_repos \
  -H "Content-Type: application/json" \
  -d '{"owner": "microsoft"}'

# Invoke a tool via JSON-RPC 2.0
curl -X POST http://localhost:3001/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "list_repos",
      "arguments": {"owner": "microsoft"}
    }
  }'

# List resources
curl http://localhost:3002/resources

# Read a resource
curl http://localhost:3002/resources/schema

# View invocation history
curl http://localhost:3001/invocations
```

### Testing the Backend API

```bash
# System health
curl http://localhost:5000/api/health

# Dashboard stats
curl http://localhost:5000/api/health/dashboard

# List servers
curl http://localhost:5000/api/servers

# Start a server
curl -X POST http://localhost:5000/api/servers/srv-github-001/start

# List tools
curl http://localhost:5000/api/tools

# Filter tools by server type
curl "http://localhost:5000/api/tools?serverType=database"

# Invoke a tool
curl -X POST http://localhost:5000/api/tools/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "serverId": "srv-database-001",
    "toolName": "list_tables",
    "arguments": {}
  }'

# Get connection logs
curl "http://localhost:5000/api/logs/connections?pageSize=10"

# Get invocation logs
curl "http://localhost:5000/api/logs/invocations?serverId=srv-github-001"

# Get log summary
curl http://localhost:5000/api/logs/summary

# Register a new server
curl -X POST http://localhost:5000/api/servers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Custom Server",
    "type": "github",
    "endpoint": "http://localhost:4001",
    "description": "Custom GitHub server instance",
    "configuration": {"token_configured": "true"}
  }'

# Trigger health check
curl -X POST http://localhost:5000/api/health/check
```

---

## 4. Project Structure Deep Dive

```
project-1-mcp-devbridge/
|
|-- docker-compose.yml                 # Orchestrates all 5 services
|-- README.md                          # Project overview and quick start
|
|-- frontend/                          # NEXT.JS 14 DASHBOARD
|   |-- Dockerfile                     # Multi-stage build (builder -> runner)
|   |-- next.config.js                 # API rewrite proxy to backend
|   |-- tailwind.config.ts             # Custom theme: colors, animations, dark mode
|   |-- tsconfig.json                  # TypeScript strict mode, path aliases (@/*)
|   |-- postcss.config.js              # Tailwind + Autoprefixer pipeline
|   |-- package.json                   # Dependencies: next, react, signalr, lucide
|   |
|   |-- src/
|       |-- app/
|       |   |-- layout.tsx             # Root layout: Inter font, Sidebar + Header shell
|       |   |-- page.tsx               # Dashboard: StatsCards, ServerStatus, ActivityFeed
|       |   |-- servers/page.tsx       # Server grid with Add/Start/Stop/Delete
|       |   |-- tools/page.tsx         # Tool registry with search, filter, invoke modal
|       |   |-- logs/page.tsx          # Connection + Invocation logs with pagination
|       |   |-- settings/page.tsx      # API config, tokens, health status sidebar
|       |
|       |-- components/
|       |   |-- layout/
|       |   |   |-- Sidebar.tsx        # 64px fixed sidebar, 5 nav items, active state
|       |   |   |-- Header.tsx         # Sticky header: health badge, dark mode, refresh
|       |   |
|       |   |-- dashboard/
|       |   |   |-- StatsCards.tsx     # 4-card metric grid with colored icons
|       |   |   |-- ServerStatus.tsx   # Server list with type icons and status badges
|       |   |   |-- ActivityFeed.tsx   # Recent invocations with relative timestamps
|       |   |
|       |   |-- servers/
|       |   |   |-- ServerCard.tsx     # Server detail card with lifecycle controls
|       |   |   |-- ServerForm.tsx     # Modal form: name, type, endpoint, config
|       |   |
|       |   |-- tools/
|       |   |   |-- ToolCard.tsx       # Tool summary with type badge, param count
|       |   |   |-- ToolInvoker.tsx    # Modal: parameter form, invoke, result viewer
|       |   |
|       |   |-- logs/
|       |       |-- LogTable.tsx       # Table view for connections and invocations
|       |
|       |-- lib/
|       |   |-- api.ts                 # ApiClient class: typed fetch wrapper for all endpoints
|       |   |-- types.ts              # TypeScript interfaces (McpServer, Tool, etc.)
|       |
|       |-- styles/
|           |-- globals.css            # CSS custom properties (light/dark), scrollbar, animations
|
|-- backend/                           # .NET 8 API GATEWAY
|   |-- McpDevBridge.sln               # Visual Studio solution file
|   |
|   |-- McpDevBridge.Api/
|       |-- Dockerfile                 # Multi-stage (SDK build -> ASP.NET runtime)
|       |-- McpDevBridge.Api.csproj    # NuGet refs: EF Core SQLite, SignalR, Swashbuckle
|       |-- Program.cs                 # DI config, middleware, routes, HealthCheckBackgroundService
|       |-- appsettings.json           # Conn strings, MCP server URLs, CORS origins
|       |
|       |-- Controllers/
|       |   |-- ServersController.cs   # 8 endpoints: CRUD + start/stop/refresh
|       |   |-- ToolsController.cs     # 4 endpoints: list, get, invoke, invocations
|       |   |-- LogsController.cs      # 3 endpoints: connections, invocations, summary
|       |   |-- HealthController.cs    # 3 endpoints: health, dashboard, check
|       |
|       |-- Models/
|       |   |-- McpServer.cs           # Entity + 3 DTOs (Create, Update, Response)
|       |   |-- Tool.cs                # Entity + 3 DTOs (Response, Invoke, InvokeResponse)
|       |   |-- ToolInvocation.cs      # Entity + 1 DTO (Response)
|       |   |-- ConnectionLog.cs       # Entity + 2 DTOs (Response, QueryParams)
|       |
|       |-- Services/
|       |   |-- McpProtocolService.cs  # JSON-RPC 2.0 HTTP client + McpProtocolException
|       |   |-- ServerManagerService.cs# Lifecycle, health checks, tool sync, SignalR
|       |   |-- LoggingService.cs      # Audit trail: connection events + invocations
|       |
|       |-- Hubs/
|       |   |-- DashboardHub.cs        # SignalR: subscribe, unsubscribe, ping
|       |
|       |-- Data/
|           |-- AppDbContext.cs         # DbSets, indexes, relationships, seed data
|
|-- mcp-servers/                       # TYPESCRIPT MCP SERVER LAYER
    |-- Dockerfile                     # Parameterized build (ARG SERVER_NAME)
    |-- package.json                   # Shared dependencies for all 3 servers
    |-- tsconfig.json                  # ES2022 target, strict mode, source maps
    |
    |-- shared/
    |   |-- types.ts                   # JSON-RPC 2.0 types, MCP protocol interfaces
    |   |-- mcp-protocol.ts           # BaseMcpServer abstract class + McpError
    |
    |-- github-server/
    |   |-- index.ts                   # GitHubMcpServer: 5 tools, 1 resource (Octokit)
    |   |-- tools.ts                   # Tool definitions with full input schemas
    |
    |-- database-server/
    |   |-- index.ts                   # DatabaseMcpServer: 4 tools, 2 resources
    |   |-- tools.ts                   # Tool definitions with full input schemas
    |
    |-- filesystem-server/
        |-- index.ts                   # FileSystemMcpServer: 4 tools, 1 resource
        |-- tools.ts                   # Tool definitions with full input schemas
```

---

## 5. API Reference

### Backend REST API Endpoints

| Method | Path | Query Params | Body | Response |
|---|---|---|---|---|
| GET | `/` | -- | -- | API info (name, version, docs link) |
| GET | `/api/health` | -- | -- | `{ status, uptime, activeServers, totalServers, recentErrors, lastChecked, version }` |
| GET | `/api/health/dashboard` | -- | -- | `{ activeConnections, totalToolCalls, totalTools, errorRate, recentActivity, serverStatuses }` |
| POST | `/api/health/check` | -- | -- | `{ message, timestamp }` |
| GET | `/api/servers` | -- | -- | `McpServerResponseDto[]` |
| GET | `/api/servers/{id}` | -- | -- | `McpServerResponseDto` |
| POST | `/api/servers` | -- | `McpServerCreateDto` | `McpServerResponseDto` (201) |
| PUT | `/api/servers/{id}` | -- | `McpServerUpdateDto` | `McpServerResponseDto` |
| DELETE | `/api/servers/{id}` | -- | -- | 204 No Content |
| POST | `/api/servers/{id}/start` | -- | -- | `McpServerResponseDto` |
| POST | `/api/servers/{id}/stop` | -- | -- | `McpServerResponseDto` |
| POST | `/api/servers/{id}/refresh-tools` | -- | -- | `McpServerResponseDto` |
| GET | `/api/tools` | `serverId?`, `serverType?` | -- | `ToolResponseDto[]` |
| GET | `/api/tools/{id}` | -- | -- | `ToolResponseDto` |
| POST | `/api/tools/invoke` | -- | `ToolInvokeDto` | `ToolInvokeResponseDto` |
| GET | `/api/tools/invocations` | `serverId?`, `page`, `pageSize` | -- | `ToolInvocationResponseDto[]` |
| GET | `/api/logs/connections` | `serverId?`, `eventType?`, `from?`, `to?`, `page`, `pageSize` | -- | `ConnectionLogResponseDto[]` |
| GET | `/api/logs/invocations` | `serverId?`, `page`, `pageSize` | -- | `ToolInvocationResponseDto[]` |
| GET | `/api/logs/summary` | -- | -- | `{ totalInvocations, errorsLastHour, errorsLast24Hours, timestamp }` |

### MCP Server Endpoints (per server)

| Method | Path | Purpose |
|---|---|---|
| POST | `/rpc` | JSON-RPC 2.0 endpoint (methods: initialize, tools/list, tools/call, resources/list, resources/read) |
| GET | `/health` | Health check |
| GET | `/info` | Server capabilities + tools + resources |
| GET | `/tools` | List all tools (REST convenience) |
| POST | `/tools/:toolName` | Invoke a tool (REST convenience) |
| GET | `/resources` | List all resources (REST convenience) |
| GET | `/resources/*` | Read a resource by URI (REST convenience) |
| GET | `/invocations` | Last 100 invocation log entries |

---

## 6. Optimization Opportunities

### 6.1 Adding New MCP Servers

The `BaseMcpServer` abstract class makes it straightforward to create new servers. Here is a template:

```typescript
// mcp-servers/my-new-server/index.ts
import { BaseMcpServer, McpError } from "../shared/mcp-protocol";
import {
  ToolDefinition,
  ToolResult,
  Resource,
  ResourceContent,
  JSON_RPC_ERRORS,
} from "../shared/types";

class MyNewMcpServer extends BaseMcpServer {
  constructor() {
    super(
      "my-new-server",
      "1.0.0",
      "Description of what this MCP server does"
    );
    // Initialize any clients, connections, or state here
  }

  async listTools(): Promise<ToolDefinition[]> {
    return [
      {
        name: "my_tool",
        description: "What this tool does",
        inputSchema: {
          type: "object",
          properties: {
            param1: {
              type: "string",
              description: "Description of param1",
            },
          },
          required: ["param1"],
        },
      },
    ];
  }

  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    switch (name) {
      case "my_tool":
        return this.myToolImpl(args);
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
        uri: "myserver://status",
        name: "Server Status",
        description: "Current status of the service",
        mimeType: "application/json",
      },
    ];
  }

  async readResource(uri: string): Promise<ResourceContent> {
    if (uri === "myserver://status" || uri === "status") {
      return {
        uri,
        mimeType: "application/json",
        text: JSON.stringify({ status: "ok" }, null, 2),
      };
    }
    throw new McpError(
      JSON_RPC_ERRORS.INVALID_PARAMS,
      `Unknown resource: ${uri}`
    );
  }

  private async myToolImpl(
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const param1 = args.param1 as string;
    // ... implementation ...
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ result: `Processed ${param1}` }, null, 2),
        },
      ],
    };
  }
}

const server = new MyNewMcpServer();
server.start();
```

Then add scripts to `mcp-servers/package.json`:

```json
{
  "scripts": {
    "start:my-new-server": "node dist/my-new-server/index.js",
    "dev:my-new-server": "tsx my-new-server/index.ts"
  }
}
```

And include the directory in `tsconfig.json`:

```json
{
  "include": [
    "shared/**/*.ts",
    "github-server/**/*.ts",
    "database-server/**/*.ts",
    "filesystem-server/**/*.ts",
    "my-new-server/**/*.ts"
  ]
}
```

---

### 6.2 WebSocket Transport for MCP

The current implementation uses HTTP POST for each JSON-RPC request. For high-throughput scenarios, upgrading to WebSocket transport eliminates per-request connection overhead.

**MCP Server side** -- add a WebSocket endpoint alongside the existing HTTP routes:

```typescript
// In BaseMcpServer, add to setupRoutes():
import { WebSocketServer, WebSocket } from "ws";
import http from "http";

private setupWebSocket(server: http.Server): void {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    console.log(`[${this.serverName}] WebSocket client connected`);

    ws.on("message", async (data: Buffer) => {
      try {
        const request = JSON.parse(data.toString());
        const result = await this.dispatchMethod(
          request.method,
          request.params || {}
        );
        ws.send(JSON.stringify({
          jsonrpc: "2.0",
          id: request.id,
          result,
        }));
      } catch (error) {
        const rpcError = error instanceof McpError
          ? { code: error.code, message: error.message }
          : { code: -32603, message: String(error) };
        ws.send(JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: rpcError,
        }));
      }
    });

    ws.on("close", () => {
      console.log(`[${this.serverName}] WebSocket client disconnected`);
    });
  });
}
```

**Backend side** -- update `McpProtocolService` to use WebSocket connections:

```csharp
// In McpProtocolService, add WebSocket support:
using System.Net.WebSockets;

public async Task<JsonObject?> SendRpcRequestViaWebSocketAsync(
    string endpoint, string method, JsonObject? parameters = null)
{
    var wsUri = new Uri(endpoint.Replace("http://", "ws://") + "/ws");
    using var ws = new ClientWebSocket();
    await ws.ConnectAsync(wsUri, CancellationToken.None);

    var requestId = Interlocked.Increment(ref _requestId);
    var rpcRequest = new JsonObject
    {
        ["jsonrpc"] = "2.0",
        ["id"] = requestId,
        ["method"] = method,
    };
    if (parameters != null)
        rpcRequest["params"] = parameters.DeepClone();

    var json = rpcRequest.ToJsonString();
    var bytes = Encoding.UTF8.GetBytes(json);
    await ws.SendAsync(bytes, WebSocketMessageType.Text, true, CancellationToken.None);

    var buffer = new byte[65536];
    var result = await ws.ReceiveAsync(buffer, CancellationToken.None);
    var responseBody = Encoding.UTF8.GetString(buffer, 0, result.Count);

    await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "", CancellationToken.None);

    var responseJson = JsonNode.Parse(responseBody)?.AsObject();
    return responseJson?["result"]?.AsObject();
}
```

---

### 6.3 Server Auto-Discovery

Instead of manually registering servers, implement a discovery mechanism where MCP servers announce themselves:

```typescript
// In BaseMcpServer, add to start():
private async announceToGateway(): Promise<void> {
  const gatewayUrl = process.env.GATEWAY_URL || "http://localhost:5000";
  const capabilities = await this.initialize();
  const tools = await this.listTools();

  try {
    const response = await fetch(`${gatewayUrl}/api/servers/discover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: this.serverName,
        version: this.serverVersion,
        description: this.serverDescription,
        endpoint: `http://localhost:${this.port}`,
        capabilities,
        tools: tools.map(t => t.name),
      }),
    });
    if (response.ok) {
      console.log(`[${this.serverName}] Registered with gateway at ${gatewayUrl}`);
    }
  } catch (error) {
    console.warn(`[${this.serverName}] Could not reach gateway: ${error}`);
  }
}
```

Backend controller for discovery:

```csharp
// In ServersController, add:
[HttpPost("discover")]
public async Task<IActionResult> Discover([FromBody] ServerDiscoveryDto dto)
{
    var existing = await _db.McpServers
        .FirstOrDefaultAsync(s => s.Endpoint == dto.Endpoint);

    if (existing != null)
    {
        existing.Status = "active";
        existing.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Server re-registered", id = existing.Id });
    }

    var server = new McpServer
    {
        Name = dto.Name,
        Type = InferTypeFromName(dto.Name),
        Endpoint = dto.Endpoint,
        Description = dto.Description,
        Status = "active",
    };
    _db.McpServers.Add(server);
    await _db.SaveChangesAsync();

    await _serverManager.RefreshServerToolsAsync(server.Id);
    return CreatedAtAction(nameof(GetById), new { id = server.Id }, server);
}
```

---

### 6.4 Tool Caching and Memoization

For tools that return deterministic results (e.g., `describe_schema`, `list_tables`), add a caching layer:

```typescript
// In BaseMcpServer, add a cache:
private toolCache = new Map<string, { result: ToolResult; expiry: number }>();

private async executeToolWithCaching(
  toolName: string,
  args: Record<string, unknown>,
  ttlMs: number = 30000
): Promise<ToolResult> {
  const cacheKey = `${toolName}:${JSON.stringify(args)}`;
  const cached = this.toolCache.get(cacheKey);

  if (cached && Date.now() < cached.expiry) {
    console.log(`[${this.serverName}] Cache hit: ${toolName}`);
    return cached.result;
  }

  const result = await this.executeToolWithLogging(toolName, args);

  if (!result.isError) {
    this.toolCache.set(cacheKey, {
      result,
      expiry: Date.now() + ttlMs,
    });
  }

  return result;
}
```

---

### 6.5 Frontend: Real-Time Updates with SignalR Client

The frontend includes `@microsoft/signalr` as a dependency but does not yet connect to the hub. Here is how to integrate it:

```typescript
// frontend/src/lib/signalr.ts
import * as signalR from "@microsoft/signalr";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

class SignalRClient {
  private connection: signalR.HubConnection;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  constructor() {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE}/hubs/dashboard`)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // Register event handlers
    this.connection.on("ServerEvent", (data) => this.emit("ServerEvent", data));
    this.connection.on("ConnectionEvent", (data) => this.emit("ConnectionEvent", data));
    this.connection.on("ToolInvocationComplete", (data) => this.emit("ToolInvocationComplete", data));
    this.connection.on("Connected", (data) => {
      console.log("SignalR connected:", data.connectionId);
    });
  }

  async start(): Promise<void> {
    if (this.connection.state === signalR.HubConnectionState.Disconnected) {
      try {
        await this.connection.start();
      } catch (err) {
        console.warn("SignalR connection failed:", err);
        // Retry after 5 seconds
        setTimeout(() => this.start(), 5000);
      }
    }
  }

  async stop(): Promise<void> {
    await this.connection.stop();
  }

  on(event: string, callback: (data: unknown) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((cb) => cb(data));
  }

  async subscribeToServer(serverId: string): Promise<void> {
    await this.connection.invoke("SubscribeToServer", serverId);
  }

  async ping(): Promise<void> {
    await this.connection.invoke("Ping");
  }
}

export const signalr = new SignalRClient();
```

Usage in a component:

```typescript
// In any page component:
import { useEffect } from "react";
import { signalr } from "@/lib/signalr";

useEffect(() => {
  signalr.start();

  const unsubServerEvent = signalr.on("ServerEvent", (data) => {
    console.log("Server event:", data);
    // Refresh server list or dashboard
    fetchServers();
  });

  const unsubToolComplete = signalr.on("ToolInvocationComplete", (data) => {
    console.log("Tool invocation complete:", data);
    // Update activity feed
    fetchDashboard();
  });

  return () => {
    unsubServerEvent();
    unsubToolComplete();
  };
}, []);
```

---

### 6.6 Backend: Connection Pooling and Request Batching

The current `McpProtocolService` creates a new HTTP request for each operation. For batch scenarios:

```csharp
// Add a batch invoke method to McpProtocolService:
public async Task<List<JsonObject?>> BatchCallToolsAsync(
    string endpoint,
    List<(string toolName, JsonObject arguments)> calls)
{
    var tasks = calls.Select(call =>
        CallToolAsync(endpoint, call.toolName, call.arguments));
    var results = await Task.WhenAll(tasks);
    return results.ToList();
}
```

For connection pooling, configure `HttpClient` properly in `Program.cs`:

```csharp
builder.Services.AddHttpClient<IMcpProtocolService, McpProtocolService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
})
.ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
{
    PooledConnectionLifetime = TimeSpan.FromMinutes(5),
    PooledConnectionIdleTimeout = TimeSpan.FromMinutes(2),
    MaxConnectionsPerServer = 10,
});
```

---

### 6.7 Adding Authentication (JWT)

Add JWT authentication to protect the backend API:

**1. Install NuGet package:**

```bash
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer --version 8.0.11
```

**2. Configure in Program.cs:**

```csharp
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

// After builder.Services setup:
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });

builder.Services.AddAuthorization();

// In the middleware pipeline (after UseCors):
app.UseAuthentication();
app.UseAuthorization();
```

**3. Add to appsettings.json:**

```json
{
  "Jwt": {
    "Key": "your-256-bit-secret-key-here-minimum-32-characters",
    "Issuer": "MCP-DevBridge",
    "Audience": "MCP-DevBridge-Clients",
    "ExpirationMinutes": 60
  }
}
```

**4. Protect controllers:**

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]  // Add this attribute
public class ServersController : ControllerBase
{
    // ...
}
```

---

## 7. Adding a New MCP Server -- Step-by-Step Tutorial

This tutorial walks through adding a **Redis MCP Server** that provides tools for interacting with a Redis cache.

### Step 1: Create the Server Directory

```bash
mkdir mcp-servers/redis-server
```

### Step 2: Define Tool Schemas

```typescript
// mcp-servers/redis-server/tools.ts
import { ToolDefinition } from "../shared/types";

export const redisTools: ToolDefinition[] = [
  {
    name: "get_key",
    description: "Get the value of a key from Redis",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "The Redis key to retrieve",
        },
      },
      required: ["key"],
    },
  },
  {
    name: "set_key",
    description: "Set a key-value pair in Redis with optional TTL",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "The Redis key",
        },
        value: {
          type: "string",
          description: "The value to store",
        },
        ttl: {
          type: "string",
          description: "Time-to-live in seconds (optional)",
        },
      },
      required: ["key", "value"],
    },
  },
  {
    name: "list_keys",
    description: "List keys matching a pattern",
    inputSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "Glob-style pattern (e.g., 'user:*')",
          default: "*",
        },
      },
      required: [],
    },
  },
];
```

### Step 3: Implement the Server

```typescript
// mcp-servers/redis-server/index.ts
import { createClient, RedisClientType } from "redis";
import { BaseMcpServer, McpError } from "../shared/mcp-protocol";
import {
  ToolDefinition, ToolResult, Resource,
  ResourceContent, JSON_RPC_ERRORS,
} from "../shared/types";
import { redisTools } from "./tools";

class RedisMcpServer extends BaseMcpServer {
  private client: RedisClientType;

  constructor() {
    super(
      "redis-server",
      "1.0.0",
      "MCP server for Redis cache operations"
    );
    this.client = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });
    this.client.connect().catch(console.error);
  }

  async listTools(): Promise<ToolDefinition[]> {
    return redisTools;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    switch (name) {
      case "get_key": {
        const key = args.key as string;
        const value = await this.client.get(key);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ key, value, exists: value !== null }, null, 2),
          }],
        };
      }
      case "set_key": {
        const key = args.key as string;
        const value = args.value as string;
        const ttl = args.ttl ? parseInt(args.ttl as string, 10) : undefined;
        if (ttl) {
          await this.client.setEx(key, ttl, value);
        } else {
          await this.client.set(key, value);
        }
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ key, status: "OK", ttl: ttl || "none" }, null, 2),
          }],
        };
      }
      case "list_keys": {
        const pattern = (args.pattern as string) || "*";
        const keys = await this.client.keys(pattern);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ pattern, count: keys.length, keys }, null, 2),
          }],
        };
      }
      default:
        throw new McpError(JSON_RPC_ERRORS.METHOD_NOT_FOUND, `Unknown tool: ${name}`);
    }
  }

  async listResources(): Promise<Resource[]> {
    return [{
      uri: "redis://info",
      name: "Redis Server Info",
      description: "Connection status and memory usage",
      mimeType: "application/json",
    }];
  }

  async readResource(uri: string): Promise<ResourceContent> {
    if (uri === "redis://info" || uri === "info") {
      const info = await this.client.info("memory");
      return { uri, mimeType: "application/json", text: info };
    }
    throw new McpError(JSON_RPC_ERRORS.INVALID_PARAMS, `Unknown resource: ${uri}`);
  }
}

const server = new RedisMcpServer();
server.start();
```

### Step 4: Install Dependencies

```bash
cd mcp-servers
npm install redis
```

### Step 5: Update Configuration Files

Add to `mcp-servers/package.json` scripts:

```json
"start:redis": "node dist/redis-server/index.js",
"dev:redis": "tsx redis-server/index.ts"
```

Add to `mcp-servers/tsconfig.json` includes:

```json
"include": ["shared/**/*.ts", "github-server/**/*.ts", "database-server/**/*.ts",
             "filesystem-server/**/*.ts", "redis-server/**/*.ts"]
```

### Step 6: Register with the Backend

```bash
curl -X POST http://localhost:5000/api/servers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Redis Server",
    "type": "database",
    "endpoint": "http://localhost:3004",
    "description": "MCP server for Redis cache operations",
    "configuration": {"redis_url": "redis://localhost:6379"}
  }'
```

### Step 7: Add to Docker Compose

```yaml
redis-server:
  build:
    context: ./mcp-servers
    dockerfile: Dockerfile
    args:
      SERVER_NAME: redis-server
  ports:
    - "3004:3004"
  environment:
    - PORT=3004
    - REDIS_URL=redis://redis:6379
  depends_on:
    - redis
  networks:
    - devbridge

redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  networks:
    - devbridge
```

---

## 8. Production Deployment

### Production Architecture Diagram

```
                            +-------------------+
                            |   Load Balancer   |
                            |   (NGINX / ALB)   |
                            +--------+----------+
                                     |
                        +------------+------------+
                        |                         |
               +--------v--------+     +----------v---------+
               | Frontend (CDN)  |     | API Gateway Cluster |
               | Next.js Static  |     | .NET 8 (2+ pods)   |
               | Export / SSR    |     | Behind LB           |
               +-----------------+     +----------+----------+
                                                  |
                                    +-------------+-------------+
                                    |             |             |
                              +-----v---+  +-----v---+  +-----v-------+
                              | GitHub  |  |Database |  | FileSystem  |
                              | Server  |  | Server  |  | Server      |
                              | (2 pods)|  | (2 pods)|  | (2 pods)    |
                              +---------+  +---------+  +-------------+
                                    |             |
                                    |      +------v------+
                                    |      | PostgreSQL  |
                              +-----v---+  | (Primary +  |
                              | GitHub  |  |  Replica)   |
                              | API     |  +-------------+
                              +---------+
                                           +-------------+
                                           | Redis Cache  |
                                           +-------------+
                                           +-------------+
                                           | Prometheus   |
                                           | + Grafana    |
                                           +-------------+
```

### Cloud Deployment Options

| Provider | Compute | Database | Storage | Monitoring |
|---|---|---|---|---|
| **AWS** | ECS Fargate / EKS | RDS PostgreSQL | S3 + EFS | CloudWatch + X-Ray |
| **Azure** | Container Apps / AKS | Azure Database for PostgreSQL | Azure Blob + Files | Application Insights |
| **GCP** | Cloud Run / GKE | Cloud SQL PostgreSQL | Cloud Storage + Filestore | Cloud Monitoring |
| **Kubernetes** | Deployments + Services | StatefulSet or external | PVC (ReadWriteMany) | Prometheus + Grafana |

### Production Docker Compose

```yaml
version: "3.8"

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.devbridge.example.com
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: "0.5"
          memory: 512M
    networks:
      - devbridge

  backend:
    build:
      context: ./backend
      dockerfile: McpDevBridge.Api/Dockerfile
    ports:
      - "5000:5000"
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ASPNETCORE_URLS=http://+:5000
      - ConnectionStrings__DefaultConnection=Host=postgres;Database=devbridge;Username=devbridge;Password=${DB_PASSWORD}
      - McpServers__GitHubServer=http://github-server:3001
      - McpServers__DatabaseServer=http://database-server:3002
      - McpServers__FileSystemServer=http://filesystem-server:3003
      - Jwt__Key=${JWT_SECRET}
      - Jwt__Issuer=MCP-DevBridge
      - Jwt__Audience=MCP-DevBridge-Clients
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: "1.0"
          memory: 1G
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - devbridge

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: devbridge
      POSTGRES_USER: devbridge
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pg-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U devbridge"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - devbridge

  github-server:
    build:
      context: ./mcp-servers
      dockerfile: Dockerfile
      args:
        SERVER_NAME: github-server
    environment:
      - PORT=3001
      - GITHUB_TOKEN=${GITHUB_TOKEN}
    deploy:
      replicas: 2
    networks:
      - devbridge

  database-server:
    build:
      context: ./mcp-servers
      dockerfile: Dockerfile
      args:
        SERVER_NAME: database-server
    environment:
      - PORT=3002
      - DB_PATH=/data/sample.db
      - ALLOW_WRITE=false
    volumes:
      - db-data:/data
    networks:
      - devbridge

  filesystem-server:
    build:
      context: ./mcp-servers
      dockerfile: Dockerfile
      args:
        SERVER_NAME: filesystem-server
    environment:
      - PORT=3003
      - SANDBOX_DIR=/sandbox
    volumes:
      - sandbox-data:/sandbox
    networks:
      - devbridge

volumes:
  pg-data:
  db-data:
  sandbox-data:

networks:
  devbridge:
    driver: bridge
```

### Environment Variables (Production)

| Variable | Service | Description |
|---|---|---|
| `DB_PASSWORD` | backend, postgres | PostgreSQL password |
| `JWT_SECRET` | backend | JWT signing key (32+ characters) |
| `GITHUB_TOKEN` | github-server | GitHub personal access token |
| `ASPNETCORE_ENVIRONMENT` | backend | Set to `Production` |
| `NODE_ENV` | frontend | Set to `production` |

---

## 9. Required Production Services

### 9.1 Authentication (JWT)

See section 6.7 above for the complete JWT implementation. In production, additionally:

- Store `Jwt:Key` in a secrets manager (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault).
- Implement token refresh endpoints.
- Add role-based claims for admin vs. read-only access.

### 9.2 Database Upgrade: SQLite to PostgreSQL

**1. Install the PostgreSQL provider:**

```bash
cd backend/McpDevBridge.Api
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL --version 8.0.11
```

**2. Update Program.cs:**

```csharp
// Replace:
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// With:
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
```

**3. Update appsettings.json (production):**

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=postgres;Database=devbridge;Username=devbridge;Password=changeme"
  }
}
```

**4. Generate and apply migrations:**

```bash
dotnet ef migrations add InitialPostgres
dotnet ef database update
```

### 9.3 Structured Logging (Serilog)

**1. Install packages:**

```bash
dotnet add package Serilog.AspNetCore
dotnet add package Serilog.Sinks.Console
dotnet add package Serilog.Sinks.Seq
```

**2. Configure in Program.cs:**

```csharp
using Serilog;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft.AspNetCore", Serilog.Events.LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .Enrich.WithProperty("Application", "MCP-DevBridge")
    .WriteTo.Console(outputTemplate:
        "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}")
    .WriteTo.Seq("http://seq:5341")  // or Elasticsearch, Datadog, etc.
    .CreateLogger();

builder.Host.UseSerilog();
```

### 9.4 Monitoring (Prometheus + Grafana)

**1. Install the Prometheus exporter:**

```bash
dotnet add package prometheus-net.AspNetCore
```

**2. Add to Program.cs:**

```csharp
using Prometheus;

// After app.UseRouting():
app.UseHttpMetrics();  // Tracks HTTP request duration and count

// Before app.Run():
app.MapMetrics();  // Exposes /metrics endpoint
```

**3. Add Prometheus + Grafana to docker-compose.yml:**

```yaml
prometheus:
  image: prom/prometheus:latest
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
  ports:
    - "9090:9090"
  networks:
    - devbridge

grafana:
  image: grafana/grafana:latest
  ports:
    - "3100:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}
  networks:
    - devbridge
```

**4. Create prometheus.yml:**

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "devbridge-api"
    static_configs:
      - targets: ["backend:5000"]
```

### 9.5 Rate Limiting

**1. Add to Program.cs:**

```csharp
using System.Threading.RateLimiting;

builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(
        httpContext =>
            RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    AutoReplenishment = true,
                    PermitLimit = 100,
                    Window = TimeSpan.FromMinutes(1),
                }));
    options.RejectionStatusCode = 429;
});

// In the middleware pipeline (after UseCors):
app.UseRateLimiter();
```

### 9.6 CORS Hardening

Update `appsettings.json` for production:

```json
{
  "Cors": {
    "AllowedOrigins": [
      "https://devbridge.example.com"
    ]
  }
}
```

### 9.7 SSL/TLS

For Docker deployments, use a reverse proxy (NGINX) with TLS termination:

```nginx
server {
    listen 443 ssl;
    server_name api.devbridge.example.com;

    ssl_certificate /etc/ssl/certs/devbridge.crt;
    ssl_certificate_key /etc/ssl/private/devbridge.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://backend:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /hubs/ {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 10. Scaling Strategy

### Horizontal Scaling

| Component | Scaling Strategy | Considerations |
|---|---|---|
| **Frontend** | CDN + multiple Next.js instances | Stateless; scale freely |
| **API Gateway** | Multiple .NET instances behind load balancer | Requires shared database; SignalR needs Redis backplane |
| **MCP Servers** | Multiple instances per server type | Stateless (except database-server with local SQLite) |
| **Database** | PostgreSQL with read replicas | Write to primary, read from replicas |

### SignalR Scale-Out with Redis

When running multiple backend instances, SignalR messages must be distributed:

```bash
dotnet add package Microsoft.AspNetCore.SignalR.StackExchangeRedis
```

```csharp
builder.Services.AddSignalR()
    .AddStackExchangeRedis(builder.Configuration["Redis:ConnectionString"]!,
        options => { options.Configuration.ChannelPrefix = "DevBridge"; });
```

### Performance Targets

| Metric | Development | Production Target |
|---|---|---|
| API response time (p95) | < 500ms | < 200ms |
| Tool invocation (p95) | < 2s | < 1s |
| Health check cycle | 30s | 15s |
| Dashboard page load | < 3s | < 1s |
| Concurrent users | 1 | 100+ |
| Tool invocations/min | -- | 1000+ |

### Caching Strategy

| Cache Layer | Technology | TTL | Content |
|---|---|---|---|
| Browser | HTTP cache headers | 60s | Static assets |
| API Gateway | In-memory (IMemoryCache) | 30s | Server list, tool list |
| MCP Servers | In-process Map | 30s | Schema, table list |
| Database | Query result cache | 60s | Invocation aggregates |

---

## 11. Monitoring and Observability

### Health Checks

The platform provides multi-level health monitoring:

**Level 1: Individual MCP Server Health**

Each MCP server exposes `GET /health`:

```json
{
  "status": "healthy",
  "server": "github-server",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Level 2: Backend Aggregate Health**

`GET /api/health` aggregates across all servers:

```json
{
  "status": "healthy",      // healthy | degraded | unhealthy
  "uptime": 3600,           // seconds since startup
  "activeServers": 3,
  "totalServers": 3,
  "recentErrors": 0,        // errors in last hour
  "lastChecked": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

**Level 3: Background Health Check Service**

`HealthCheckBackgroundService` runs every 30 seconds:
- Iterates all non-inactive servers.
- Calls `GET /health` on each.
- Updates server status in the database.
- Logs state transitions.
- Broadcasts SignalR notifications on status changes.

### Structured Logging

Current log output format (console):

```
[github-server] MCP Server running on port 3001
[github-server] Tool call: list_repos (245ms) - OK
[github-server] Tool call FAILED: get_repo (150ms) - Error: Not Found
```

Production logging should use structured JSON format (see section 9.3 for Serilog setup).

### APM Integration

For Application Performance Monitoring, instrument with OpenTelemetry:

```bash
dotnet add package OpenTelemetry.Extensions.Hosting
dotnet add package OpenTelemetry.Instrumentation.AspNetCore
dotnet add package OpenTelemetry.Instrumentation.Http
dotnet add package OpenTelemetry.Exporter.Prometheus.AspNetCore
```

```csharp
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;

builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddSource("McpDevBridge"))
    .WithMetrics(metrics => metrics
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddPrometheusExporter());
```

---

## 12. Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|---|---|---|
| Frontend shows "No servers configured" | Backend not running or CORS blocking | Verify backend is running at port 5000; check browser console for CORS errors |
| Server status shows "Error" after clicking Start | MCP server process not running | Start the MCP server process first, then click Start in the UI |
| `ECONNREFUSED` in backend logs | MCP server unreachable at configured endpoint | Verify the MCP server is running and the port matches `appsettings.json` |
| GitHub tools return "No GitHub token configured" | `GITHUB_TOKEN` not set | Export `GITHUB_TOKEN=ghp_...` before starting the GitHub server |
| Database server shows "Write operations disabled" | `ALLOW_WRITE` not set to `true` | Set `ALLOW_WRITE=true` in environment or server config |
| `SQLITE_BUSY` errors | Multiple writers to the same SQLite file | Use WAL mode (already configured); consider PostgreSQL for production |
| Docker build fails on `npm install` | Missing `package-lock.json` | Run `npm install` locally first to generate the lockfile |
| SignalR connection fails | Backend not accepting WebSocket connections | Ensure the `/hubs/dashboard` route is mapped; check CORS allows credentials |
| Tool invocation returns 502 | MCP server returned a JSON-RPC error | Check MCP server logs for the specific error; verify tool parameters |
| Frontend dark mode not toggling | `classList.toggle` not reaching `<html>` | Clear localStorage and refresh; verify `layout.tsx` has `className="dark"` |
| Swagger UI not loading | Running in Production environment | Swagger is only enabled in Development; set `ASPNETCORE_ENVIRONMENT=Development` |
| Port already in use | Another process on the same port | Use `lsof -i :PORT_NUMBER` to find the process; kill it or change the port |
| `dotnet restore` fails | Missing .NET 8 SDK | Install from https://dotnet.microsoft.com/download/dotnet/8.0 |
| TypeScript compilation errors | Outdated types or missing dependencies | Run `npm install` in `mcp-servers/`; verify `tsconfig.json` includes all directories |
| Health check shows "degraded" | Some servers are down | Check which servers are offline in the Servers page; restart them |

### Diagnostic Commands

```bash
# Check if all ports are available
for port in 3000 3001 3002 3003 5000; do
  nc -z localhost $port && echo "Port $port: OPEN" || echo "Port $port: CLOSED"
done

# View Docker container logs
docker-compose logs -f backend
docker-compose logs -f github-server

# Check backend database
sqlite3 backend/McpDevBridge.Api/devbridge.db "SELECT * FROM McpServers;"

# Test JSON-RPC directly
curl -s -X POST http://localhost:3001/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}' | python3 -m json.tool

# Check server health from inside Docker network
docker-compose exec backend curl http://github-server:3001/health

# Rebuild a single service
docker-compose build --no-cache github-server
docker-compose up -d github-server
```
