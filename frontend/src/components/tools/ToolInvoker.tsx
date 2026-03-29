"use client";

import { useState } from "react";
import {
  X,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Tool, ToolInvokeResponse } from "@/lib/types";

interface ToolInvokerProps {
  tool: Tool;
  onClose: () => void;
}

export default function ToolInvoker({ tool, onClose }: ToolInvokerProps) {
  const [args, setArgs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ToolInvokeResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const properties = tool.inputSchema?.properties || {};
  const required = tool.inputSchema?.required || [];

  const handleInvoke = async () => {
    setError("");
    setResult(null);

    // Validate required fields
    for (const req of required) {
      if (!args[req]?.trim()) {
        setError(`Required parameter '${req}' is missing`);
        return;
      }
    }

    // Build arguments object (only non-empty values)
    const invokeArgs: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args)) {
      if (value.trim()) {
        invokeArgs[key] = value.trim();
      }
    }

    setRunning(true);
    try {
      const response = await api.invokeTool({
        serverId: tool.serverId,
        toolName: tool.name,
        arguments: invokeArgs,
      });
      setResult(response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to invoke tool"
      );
    }
    setRunning(false);
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result.result, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatResult = (data: unknown): string => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <code className="text-base font-bold text-foreground">
              {tool.name}
            </code>
            <p className="mt-0.5 text-xs text-muted-foreground">
              via {tool.serverName} ({tool.serverType})
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-sm text-muted-foreground">{tool.description}</p>

          {/* Parameters */}
          {Object.keys(properties).length > 0 && (
            <div className="mt-5 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Parameters
              </h4>
              {Object.entries(properties).map(([key, prop]) => {
                const isRequired = required.includes(key);
                return (
                  <div key={key}>
                    <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                      {key}
                      {isRequired && (
                        <span className="text-[10px] text-destructive">
                          required
                        </span>
                      )}
                    </label>
                    <p className="mb-1.5 text-[11px] text-muted-foreground">
                      {prop.description}
                    </p>
                    {prop.enum ? (
                      <select
                        value={args[key] || ""}
                        onChange={(e) =>
                          setArgs({ ...args, [key]: e.target.value })
                        }
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                      >
                        <option value="">
                          {prop.default
                            ? `Default: ${prop.default}`
                            : "Select..."}
                        </option>
                        {prop.enum.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={args[key] || ""}
                        onChange={(e) =>
                          setArgs({ ...args, [key]: e.target.value })
                        }
                        placeholder={
                          prop.default ? `Default: ${prop.default}` : `Enter ${key}...`
                        }
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="mt-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Result
                  </h4>
                  {result.isError ? (
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  )}
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {result.durationMs}ms
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent"
                >
                  {copied ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-muted p-4 text-xs text-foreground">
                {formatResult(result.result)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border p-5">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
          >
            Close
          </button>
          <button
            onClick={handleInvoke}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {running ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Invoke Tool
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
