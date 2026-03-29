// ============================================================
// MCP DevBridge Frontend - Type Definitions
// ============================================================

export interface McpServer {
  id: string;
  name: string;
  type: "github" | "database" | "filesystem";
  endpoint: string;
  status: "active" | "inactive" | "error";
  description: string;
  configuration: Record<string, string>;
  toolCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Tool {
  id: string;
  serverId: string;
  serverName: string;
  serverType: string;
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  enabled: boolean;
  createdAt: string;
}

export interface ToolInputSchema {
  type: string;
  properties: Record<string, ToolProperty>;
  required?: string[];
}

export interface ToolProperty {
  type: string;
  description: string;
  enum?: string[];
  default?: unknown;
}

export interface ToolInvocation {
  id: string;
  serverId: string;
  serverName: string;
  toolName: string;
  input: Record<string, unknown>;
  output: unknown;
  status: "success" | "error" | "pending";
  durationMs: number;
  timestamp: string;
}

export interface ConnectionLog {
  id: string;
  serverId: string;
  serverName: string;
  event: "connected" | "disconnected" | "error" | "tool_call";
  message: string;
  details?: string;
  timestamp: string;
}

export interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  activeServers: number;
  totalServers: number;
  recentErrors: number;
  lastChecked: string;
  version: string;
}

export interface DashboardStats {
  activeConnections: number;
  totalToolCalls: number;
  totalTools: number;
  errorRate: number;
  recentActivity: ToolInvocation[];
  serverStatuses: McpServer[];
}

export interface ToolInvokeRequest {
  serverId: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

export interface ToolInvokeResponse {
  invocationId: string;
  serverId: string;
  toolName: string;
  result: unknown;
  isError: boolean;
  durationMs: number;
  timestamp: string;
}

export interface ServerCreateRequest {
  name: string;
  type: string;
  endpoint: string;
  description: string;
  configuration: Record<string, string>;
}
