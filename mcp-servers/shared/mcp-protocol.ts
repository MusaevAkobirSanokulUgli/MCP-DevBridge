// ============================================================
// MCP DevBridge - MCP Protocol Base Implementation
// JSON-RPC 2.0 transport over HTTP for MCP servers
// ============================================================

import express, { Request, Response } from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import {
  JsonRpcRequest,
  JsonRpcResponse,
  JSON_RPC_ERRORS,
  McpServerInterface,
  ServerCapabilities,
  ToolDefinition,
  ToolResult,
  Resource,
  ResourceContent,
} from "./types";

export abstract class BaseMcpServer implements McpServerInterface {
  protected serverName: string;
  protected serverVersion: string;
  protected serverDescription: string;
  private app: express.Application;
  private port: number;
  private invocationLog: Array<{
    id: string;
    toolName: string;
    input: Record<string, unknown>;
    output: unknown;
    status: string;
    duration: number;
    timestamp: string;
  }> = [];

  constructor(name: string, version: string, description: string) {
    this.serverName = name;
    this.serverVersion = version;
    this.serverDescription = description;
    this.port = parseInt(process.env.PORT || "3001", 10);
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  // --- Abstract methods for subclasses ---
  abstract listTools(): Promise<ToolDefinition[]>;
  abstract callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<ToolResult>;
  abstract listResources(): Promise<Resource[]>;
  abstract readResource(uri: string): Promise<ResourceContent>;

  // --- MCP Protocol: initialize ---
  async initialize(): Promise<ServerCapabilities> {
    return {
      name: this.serverName,
      version: this.serverVersion,
      description: this.serverDescription,
      capabilities: {
        tools: true,
        resources: true,
        prompts: false,
      },
    };
  }

  // --- HTTP Server Setup ---

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json({ limit: "10mb" }));
  }

  private setupRoutes(): void {
    // JSON-RPC 2.0 endpoint
    this.app.post("/rpc", this.handleJsonRpc.bind(this));

    // REST endpoints for convenience / health
    this.app.get("/health", (_req: Request, res: Response) => {
      res.json({
        status: "healthy",
        server: this.serverName,
        version: this.serverVersion,
        timestamp: new Date().toISOString(),
      });
    });

    this.app.get("/info", async (_req: Request, res: Response) => {
      try {
        const capabilities = await this.initialize();
        const tools = await this.listTools();
        const resources = await this.listResources();
        res.json({ capabilities, tools, resources });
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });

    // REST convenience: list tools
    this.app.get("/tools", async (_req: Request, res: Response) => {
      try {
        const tools = await this.listTools();
        res.json(tools);
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });

    // REST convenience: call a tool
    this.app.post("/tools/:toolName", async (req: Request, res: Response) => {
      try {
        const result = await this.executeToolWithLogging(
          req.params.toolName as string,
          req.body || {}
        );
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });

    // REST convenience: list resources
    this.app.get("/resources", async (_req: Request, res: Response) => {
      try {
        const resources = await this.listResources();
        res.json(resources);
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });

    // REST convenience: read a resource
    this.app.get("/resources/*", async (req: Request, res: Response) => {
      try {
        const uri = req.params[0] || "";
        const content = await this.readResource(uri);
        res.json(content);
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });

    // Invocation history
    this.app.get("/invocations", (_req: Request, res: Response) => {
      res.json(this.invocationLog.slice(-100));
    });
  }

  private async handleJsonRpc(req: Request, res: Response): Promise<void> {
    const body = req.body as JsonRpcRequest;

    // Validate JSON-RPC request
    if (!body || body.jsonrpc !== "2.0" || !body.method) {
      const errorResponse: JsonRpcResponse = {
        jsonrpc: "2.0",
        id: body?.id ?? null,
        error: {
          code: JSON_RPC_ERRORS.INVALID_REQUEST,
          message: "Invalid JSON-RPC 2.0 request",
        },
      };
      res.status(400).json(errorResponse);
      return;
    }

    try {
      const result = await this.dispatchMethod(body.method, body.params || {});
      const response: JsonRpcResponse = {
        jsonrpc: "2.0",
        id: body.id,
        result,
      };
      res.json(response);
    } catch (error) {
      const rpcError =
        error instanceof McpError
          ? { code: error.code, message: error.message, data: error.data }
          : {
              code: JSON_RPC_ERRORS.INTERNAL_ERROR,
              message: String(error),
            };

      const errorResponse: JsonRpcResponse = {
        jsonrpc: "2.0",
        id: body.id,
        error: rpcError,
      };
      res.status(200).json(errorResponse);
    }
  }

  private async dispatchMethod(
    method: string,
    params: Record<string, unknown>
  ): Promise<unknown> {
    switch (method) {
      case "initialize":
        return this.initialize();

      case "tools/list":
        return { tools: await this.listTools() };

      case "tools/call": {
        const toolName = params.name as string;
        const toolArgs = (params.arguments as Record<string, unknown>) || {};
        if (!toolName) {
          throw new McpError(
            JSON_RPC_ERRORS.INVALID_PARAMS,
            "Missing tool name"
          );
        }
        return this.executeToolWithLogging(toolName, toolArgs);
      }

      case "resources/list":
        return { resources: await this.listResources() };

      case "resources/read": {
        const uri = params.uri as string;
        if (!uri) {
          throw new McpError(
            JSON_RPC_ERRORS.INVALID_PARAMS,
            "Missing resource URI"
          );
        }
        return this.readResource(uri);
      }

      default:
        throw new McpError(
          JSON_RPC_ERRORS.METHOD_NOT_FOUND,
          `Unknown method: ${method}`
        );
    }
  }

  private async executeToolWithLogging(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const invocationId = uuidv4();

    try {
      const result = await this.callTool(toolName, args);
      const duration = Date.now() - startTime;

      this.invocationLog.push({
        id: invocationId,
        toolName,
        input: args,
        output: result,
        status: result.isError ? "error" : "success",
        duration,
        timestamp: new Date().toISOString(),
      });

      // Keep log bounded
      if (this.invocationLog.length > 1000) {
        this.invocationLog = this.invocationLog.slice(-500);
      }

      console.log(
        `[${this.serverName}] Tool call: ${toolName} (${duration}ms) - ${result.isError ? "ERROR" : "OK"}`
      );
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.invocationLog.push({
        id: invocationId,
        toolName,
        input: args,
        output: { error: String(error) },
        status: "error",
        duration,
        timestamp: new Date().toISOString(),
      });

      console.error(
        `[${this.serverName}] Tool call FAILED: ${toolName} (${duration}ms) - ${error}`
      );
      return {
        content: [{ type: "text", text: `Error: ${String(error)}` }],
        isError: true,
      };
    }
  }

  // --- Start the server ---
  start(): void {
    this.app.listen(this.port, () => {
      console.log(
        `[${this.serverName}] MCP Server running on port ${this.port}`
      );
      console.log(`[${this.serverName}] JSON-RPC endpoint: POST /rpc`);
      console.log(`[${this.serverName}] Health check: GET /health`);
      console.log(`[${this.serverName}] Server info: GET /info`);
    });
  }
}

// --- Custom error class for MCP ---
export class McpError extends Error {
  code: number;
  data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.code = code;
    this.data = data;
    this.name = "McpError";
  }
}
