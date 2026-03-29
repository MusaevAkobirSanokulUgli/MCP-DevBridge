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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

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
    return this.request<SystemHealth>("/api/health");
  }

  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>("/api/health/dashboard");
  }

  async triggerHealthCheck(): Promise<{ message: string; timestamp: string }> {
    return this.request("/api/health/check", { method: "POST" });
  }

  // --- Servers ---

  async getServers(): Promise<McpServer[]> {
    return this.request<McpServer[]>("/api/servers");
  }

  async getServer(id: string): Promise<McpServer> {
    return this.request<McpServer>(`/api/servers/${id}`);
  }

  async createServer(data: ServerCreateRequest): Promise<McpServer> {
    return this.request<McpServer>("/api/servers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateServer(
    id: string,
    data: Partial<ServerCreateRequest>
  ): Promise<McpServer> {
    return this.request<McpServer>(`/api/servers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteServer(id: string): Promise<void> {
    return this.request(`/api/servers/${id}`, { method: "DELETE" });
  }

  async startServer(id: string): Promise<McpServer> {
    return this.request<McpServer>(`/api/servers/${id}/start`, {
      method: "POST",
    });
  }

  async stopServer(id: string): Promise<McpServer> {
    return this.request<McpServer>(`/api/servers/${id}/stop`, {
      method: "POST",
    });
  }

  async refreshServerTools(id: string): Promise<McpServer> {
    return this.request<McpServer>(`/api/servers/${id}/refresh-tools`, {
      method: "POST",
    });
  }

  // --- Tools ---

  async getTools(serverId?: string, serverType?: string): Promise<Tool[]> {
    const params = new URLSearchParams();
    if (serverId) params.set("serverId", serverId);
    if (serverType) params.set("serverType", serverType);
    const query = params.toString();
    return this.request<Tool[]>(`/api/tools${query ? `?${query}` : ""}`);
  }

  async getTool(id: string): Promise<Tool> {
    return this.request<Tool>(`/api/tools/${id}`);
  }

  async invokeTool(data: ToolInvokeRequest): Promise<ToolInvokeResponse> {
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
    return this.request("/api/logs/summary");
  }
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export const api = new ApiClient(API_BASE);
