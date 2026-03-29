// ============================================================
// MCP DevBridge - Shared Types
// JSON-RPC 2.0 and MCP Protocol type definitions
// ============================================================

// --- JSON-RPC 2.0 Types ---

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
}

// Standard JSON-RPC error codes
export const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

// --- MCP Protocol Types ---

export interface ServerCapabilities {
  name: string;
  version: string;
  description: string;
  capabilities: {
    tools: boolean;
    resources: boolean;
    prompts: boolean;
  };
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, ToolPropertySchema>;
    required?: string[];
  };
}

export interface ToolPropertySchema {
  type: string;
  description: string;
  enum?: string[];
  default?: unknown;
}

export interface ToolResult {
  content: ToolContent[];
  isError?: boolean;
}

export interface ToolContent {
  type: "text" | "image" | "resource";
  text?: string;
  data?: string;
  mimeType?: string;
  resource?: ResourceReference;
}

export interface ResourceReference {
  uri: string;
  mimeType?: string;
  text?: string;
}

export interface Resource {
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
}

export interface ResourceContent {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: string;
}

// --- MCP Server Interface ---

export interface McpServerInterface {
  initialize(): Promise<ServerCapabilities>;
  listTools(): Promise<ToolDefinition[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<ToolResult>;
  listResources(): Promise<Resource[]>;
  readResource(uri: string): Promise<ResourceContent>;
}

// --- API Types (shared between frontend and backend) ---

export interface McpServerConfig {
  id: string;
  name: string;
  type: "github" | "database" | "filesystem";
  endpoint: string;
  status: "active" | "inactive" | "error";
  description: string;
  configuration: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface ToolInvocationRecord {
  id: string;
  serverId: string;
  serverName: string;
  toolName: string;
  input: Record<string, unknown>;
  output: unknown;
  status: "success" | "error";
  duration: number;
  timestamp: string;
}

export interface ConnectionLogEntry {
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
}

export interface DashboardStats {
  activeConnections: number;
  totalToolCalls: number;
  totalTools: number;
  errorRate: number;
  recentActivity: ToolInvocationRecord[];
  serverStatuses: McpServerConfig[];
}
