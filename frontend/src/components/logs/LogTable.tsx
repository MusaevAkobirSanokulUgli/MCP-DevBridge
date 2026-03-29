"use client";

import {
  CheckCircle2,
  XCircle,
  Link2,
  Unlink2,
  AlertCircle,
  Wrench,
} from "lucide-react";
import type { ConnectionLog, ToolInvocation } from "@/lib/types";

interface LogTableProps {
  connectionLogs: ConnectionLog[];
  invocationLogs: ToolInvocation[];
  activeTab: "connections" | "invocations";
  loading: boolean;
}

const eventIcons: Record<string, React.ReactNode> = {
  connected: <Link2 className="h-3.5 w-3.5 text-green-500" />,
  disconnected: <Unlink2 className="h-3.5 w-3.5 text-gray-400" />,
  error: <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
  tool_call: <Wrench className="h-3.5 w-3.5 text-blue-500" />,
};

const eventStyles: Record<string, string> = {
  connected: "bg-green-500/10 text-green-500",
  disconnected: "bg-gray-400/10 text-gray-400",
  error: "bg-red-500/10 text-red-500",
  tool_call: "bg-blue-500/10 text-blue-500",
};

export default function LogTable({
  connectionLogs,
  invocationLogs,
  activeTab,
  loading,
}: LogTableProps) {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  &nbsp;
                </th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b border-border">
                  <td className="px-4 py-4">
                    <div className="animate-pulse">
                      <div className="h-4 w-full rounded bg-muted" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (activeTab === "connections") {
    return (
      <div className="rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Event
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Server
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Message
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody>
              {connectionLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No connection logs found
                  </td>
                </tr>
              ) : (
                connectionLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-border transition-colors hover:bg-accent/50"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${eventStyles[log.event] || ""}`}
                      >
                        {eventIcons[log.event]}
                        {log.event}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground">
                      {log.serverName}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {log.message}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {formatTime(log.timestamp)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Invocations tab
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Status
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Tool
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Server
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Duration
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Timestamp
              </th>
            </tr>
          </thead>
          <tbody>
            {invocationLogs.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  No tool invocations found
                </td>
              </tr>
            ) : (
              invocationLogs.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-border transition-colors hover:bg-accent/50"
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    {inv.status === "success" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : inv.status === "error" ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <code className="text-xs font-semibold text-foreground">
                      {inv.toolName}
                    </code>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                    {inv.serverName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {inv.durationMs}ms
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {formatTime(inv.timestamp)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
