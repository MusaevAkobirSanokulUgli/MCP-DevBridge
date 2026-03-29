"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import LogTable from "@/components/logs/LogTable";
import { api } from "@/lib/api";
import type { ConnectionLog, ToolInvocation } from "@/lib/types";

export default function LogsPage() {
  const [activeTab, setActiveTab] = useState<"connections" | "invocations">(
    "connections"
  );
  const [connectionLogs, setConnectionLogs] = useState<ConnectionLog[]>([]);
  const [invocationLogs, setInvocationLogs] = useState<ToolInvocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<{
    totalInvocations: number;
    errorsLastHour: number;
    errorsLast24Hours: number;
  } | null>(null);

  const pageSize = 50;

  useEffect(() => {
    fetchLogs();
    fetchSummary();
  }, [activeTab, page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      if (activeTab === "connections") {
        const data = await api.getConnectionLogs(
          undefined,
          undefined,
          page,
          pageSize
        );
        setConnectionLogs(data);
      } else {
        const data = await api.getInvocationLogs(undefined, page, pageSize);
        setInvocationLogs(data);
      }
    } catch {
      setConnectionLogs([]);
      setInvocationLogs([]);
    }
    setLoading(false);
  };

  const fetchSummary = async () => {
    try {
      const data = await api.getLogSummary();
      setSummary(data);
    } catch {
      // Silently handle
    }
  };

  const handleTabChange = (tab: "connections" | "invocations") => {
    setActiveTab(tab);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Activity Logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor all MCP server connections and tool invocations
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Total Invocations
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {summary.totalInvocations}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Errors (Last Hour)
            </p>
            <p
              className={`mt-1 text-2xl font-bold ${summary.errorsLastHour > 0 ? "text-red-500" : "text-green-500"}`}
            >
              {summary.errorsLastHour}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Errors (24h)
            </p>
            <p
              className={`mt-1 text-2xl font-bold ${summary.errorsLast24Hours > 0 ? "text-yellow-500" : "text-green-500"}`}
            >
              {summary.errorsLast24Hours}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
        <button
          onClick={() => handleTabChange("connections")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "connections"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Connection Events
        </button>
        <button
          onClick={() => handleTabChange("invocations")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "invocations"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Tool Invocations
        </button>
      </div>

      {/* Log Table */}
      <LogTable
        connectionLogs={connectionLogs}
        invocationLogs={invocationLogs}
        activeTab={activeTab}
        loading={loading}
      />

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Page {page} | Showing up to {pageSize} entries
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-50"
          >
            <ChevronLeft className="h-3 w-3" />
            Previous
          </button>
          <button
            onClick={() => setPage(page + 1)}
            disabled={
              (activeTab === "connections"
                ? connectionLogs.length
                : invocationLogs.length) < pageSize
            }
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
