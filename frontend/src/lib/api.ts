// ============================================================
// MCP DevBridge Frontend - API Client
// Centralized API communication with the .NET backend
// ============================================================

import type {
  McpServer,
  Tool,
  ToolInvocation,
  ConnectionLog,
  SystemHealth,
  DashboardStats,
  ToolInvokeRequest,
  ToolInvokeResponse,
  ServerCreateRequest,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

/** True when no backend URL is configured (e.g. Vercel-only deployment) */
const IS_DEMO_MODE = !API_BASE;

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage: string;
        try {
          const parsed = JSON.parse(errorBody);
          errorMessage = parsed.message || parsed.error || `HTTP ${response.status}`;
        } catch {
          errorMessage = errorBody || `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new ApiError(errorMessage, response.status);
      }

      if (response.status === 204) {
        return undefined as unknown as T;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
        0
      );
    }
  }

  // --- Health ---

  async getHealth(): Promise<SystemHealth> {
    if (IS_DEMO_MODE) return DEMO_HEALTH;
    return this.request<SystemHealth>("/api/health");
  }

  async getDashboardStats(): Promise<DashboardStats> {
    if (IS_DEMO_MODE) return DEMO_DASHBOARD;
    return this.request<DashboardStats>("/api/health/dashboard");
  }

  async triggerHealthCheck(): Promise<{ message: string; timestamp: string }> {
    if (IS_DEMO_MODE) return { message: "Demo mode — deploy backend for real health checks", timestamp: new Date().toISOString() };
    return this.request("/api/health/check", { method: "POST" });
  }

  // --- Servers ---

  async getServers(): Promise<McpServer[]> {
    if (IS_DEMO_MODE) return DEMO_SERVERS;
    return this.request<McpServer[]>("/api/servers");
  }

  async getServer(id: string): Promise<McpServer> {
    if (IS_DEMO_MODE) return DEMO_SERVERS.find(sv => sv.id === id) || DEMO_SERVERS[0];
    return this.request<McpServer>(`/api/servers/${id}`);
  }

  async createServer(data: ServerCreateRequest): Promise<McpServer> {
    if (IS_DEMO_MODE) {
      const server: McpServer = {
        id: `demo-${Date.now()}`, name: data.name, type: data.type as McpServer["type"],
        endpoint: data.endpoint, status: "inactive", description: data.description,
        configuration: data.configuration, toolCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      DEMO_SERVERS.push(server);
      return server;
    }
    return this.request<McpServer>("/api/servers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateServer(
    id: string,
    data: Partial<ServerCreateRequest>
  ): Promise<McpServer> {
    if (IS_DEMO_MODE) {
      const s = DEMO_SERVERS.find(sv => sv.id === id);
      if (s) Object.assign(s, data);
      return s || DEMO_SERVERS[0];
    }
    return this.request<McpServer>(`/api/servers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteServer(id: string): Promise<void> {
    if (IS_DEMO_MODE) return;
    return this.request(`/api/servers/${id}`, { method: "DELETE" });
  }

  async startServer(id: string): Promise<McpServer> {
    if (IS_DEMO_MODE) {
      const s = DEMO_SERVERS.find(sv => sv.id === id);
      if (s) s.status = "active";
      return s || DEMO_SERVERS[0];
    }
    return this.request<McpServer>(`/api/servers/${id}/start`, {
      method: "POST",
    });
  }

  async stopServer(id: string): Promise<McpServer> {
    if (IS_DEMO_MODE) {
      const s = DEMO_SERVERS.find(sv => sv.id === id);
      if (s) s.status = "inactive";
      return s || DEMO_SERVERS[0];
    }
    return this.request<McpServer>(`/api/servers/${id}/stop`, {
      method: "POST",
    });
  }

  async refreshServerTools(id: string): Promise<McpServer> {
    if (IS_DEMO_MODE) return DEMO_SERVERS.find(sv => sv.id === id) || DEMO_SERVERS[0];
    return this.request<McpServer>(`/api/servers/${id}/refresh-tools`, {
      method: "POST",
    });
  }

  // --- Tools ---

  async getTools(serverId?: string, serverType?: string): Promise<Tool[]> {
    if (IS_DEMO_MODE) return DEMO_TOOLS;
    const params = new URLSearchParams();
    if (serverId) params.set("serverId", serverId);
    if (serverType) params.set("serverType", serverType);
    const query = params.toString();
    return this.request<Tool[]>(`/api/tools${query ? `?${query}` : ""}`);
  }

  async getTool(id: string): Promise<Tool> {
    if (IS_DEMO_MODE) return DEMO_TOOLS.find(tl => tl.id === id) || DEMO_TOOLS[0];
    return this.request<Tool>(`/api/tools/${id}`);
  }

  async invokeTool(data: ToolInvokeRequest): Promise<ToolInvokeResponse> {
    if (IS_DEMO_MODE) {
      return {
        invocationId: `inv-${Date.now()}`,
        serverId: data.serverId,
        toolName: data.toolName,
        result: `[Demo Mode] Tool "${data.toolName}" invoked. Deploy the backend with MCP servers for real tool execution.`,
        isError: false,
        durationMs: 150,
        timestamp: new Date().toISOString(),
      };
    }
    return this.request<ToolInvokeResponse>("/api/tools/invoke", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getToolInvocations(
    serverId?: string,
    page = 1,
    pageSize = 50
  ): Promise<ToolInvocation[]> {
    if (IS_DEMO_MODE) return [];
    const params = new URLSearchParams();
    if (serverId) params.set("serverId", serverId);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    return this.request<ToolInvocation[]>(
      `/api/tools/invocations?${params.toString()}`
    );
  }

  // --- Logs ---

  async getConnectionLogs(
    serverId?: string,
    eventType?: string,
    page = 1,
    pageSize = 50
  ): Promise<ConnectionLog[]> {
    if (IS_DEMO_MODE) return [];
    const params = new URLSearchParams();
    if (serverId) params.set("serverId", serverId);
    if (eventType) params.set("eventType", eventType);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    return this.request<ConnectionLog[]>(
      `/api/logs/connections?${params.toString()}`
    );
  }

  async getInvocationLogs(
    serverId?: string,
    page = 1,
    pageSize = 50
  ): Promise<ToolInvocation[]> {
    if (IS_DEMO_MODE) return [];
    const params = new URLSearchParams();
    if (serverId) params.set("serverId", serverId);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    return this.request<ToolInvocation[]>(
      `/api/logs/invocations?${params.toString()}`
    );
  }

  async getLogSummary(): Promise<{
    totalInvocations: number;
    errorsLastHour: number;
    errorsLast24Hours: number;
    timestamp: string;
  }> {
    if (IS_DEMO_MODE) return { totalInvocations: 127, errorsLastHour: 0, errorsLast24Hours: 2, timestamp: new Date().toISOString() };
    return this.request("/api/logs/summary");
  }
}

// ---- Demo Data ----
const now = new Date().toISOString();
const emptySchema = { type: "object", properties: {} } as const;

const DEMO_SERVERS: McpServer[] = [
  { id: "srv-github-001", name: "GitHub Server", type: "github", endpoint: "http://localhost:3001", status: "inactive", description: "GitHub API integration", configuration: {}, toolCount: 2, createdAt: now, updatedAt: now },
  { id: "srv-database-001", name: "Database Server", type: "database", endpoint: "http://localhost:3002", status: "inactive", description: "SQLite database integration", configuration: {}, toolCount: 2, createdAt: now, updatedAt: now },
  { id: "srv-filesystem-001", name: "FileSystem Server", type: "filesystem", endpoint: "http://localhost:3003", status: "inactive", description: "File system operations (sandboxed)", configuration: {}, toolCount: 2, createdAt: now, updatedAt: now },
];

const DEMO_TOOLS: Tool[] = [
  { id: "tool-1", name: "list_repos", description: "List GitHub repositories for an owner", serverId: "srv-github-001", serverName: "GitHub Server", serverType: "github", inputSchema: emptySchema, enabled: true, createdAt: now },
  { id: "tool-2", name: "create_issue", description: "Create a GitHub issue", serverId: "srv-github-001", serverName: "GitHub Server", serverType: "github", inputSchema: emptySchema, enabled: true, createdAt: now },
  { id: "tool-3", name: "list_tables", description: "List database tables", serverId: "srv-database-001", serverName: "Database Server", serverType: "database", inputSchema: emptySchema, enabled: true, createdAt: now },
  { id: "tool-4", name: "query_table", description: "Run SQL query on a table", serverId: "srv-database-001", serverName: "Database Server", serverType: "database", inputSchema: emptySchema, enabled: true, createdAt: now },
  { id: "tool-5", name: "list_files", description: "List files in a directory", serverId: "srv-filesystem-001", serverName: "FileSystem Server", serverType: "filesystem", inputSchema: emptySchema, enabled: true, createdAt: now },
  { id: "tool-6", name: "read_file", description: "Read file contents", serverId: "srv-filesystem-001", serverName: "FileSystem Server", serverType: "filesystem", inputSchema: emptySchema, enabled: true, createdAt: now },
];

const DEMO_HEALTH: SystemHealth = {
  status: "degraded",
  uptime: 0,
  activeServers: 0,
  totalServers: 3,
  recentErrors: 0,
  lastChecked: now,
  version: "1.0.0 (demo)",
};

const DEMO_DASHBOARD: DashboardStats = {
  activeConnections: 0,
  totalToolCalls: 127,
  totalTools: 6,
  errorRate: 0,
  recentActivity: [],
  serverStatuses: DEMO_SERVERS,
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export const api = new ApiClient(API_BASE);

/** Returns true if running in demo mode (no backend configured) */
export function isDemoMode(): boolean {
  return IS_DEMO_MODE;
}
