"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import ServerCard from "@/components/servers/ServerCard";
import ServerForm from "@/components/servers/ServerForm";
import { api } from "@/lib/api";
import type { McpServer } from "@/lib/types";

export default function ServersPage() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    setLoading(true);
    try {
      const data = await api.getServers();
      setServers(data);
    } catch {
      // If backend not available, show empty state
      setServers([]);
    }
    setLoading(false);
  };

  const activeCount = servers.filter((s) => s.status === "active").length;
  const errorCount = servers.filter((s) => s.status === "error").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">MCP Servers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your MCP server connections and configurations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchServers}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Server
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3">
        <span className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{servers.length}</span>{" "}
          total
        </span>
        <span className="text-sm text-muted-foreground">
          <span className="font-semibold text-green-500">{activeCount}</span>{" "}
          active
        </span>
        {errorCount > 0 && (
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-red-500">{errorCount}</span>{" "}
            errors
          </span>
        )}
      </div>

      {/* Server Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-border bg-card p-6"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-muted" />
                <div>
                  <div className="h-5 w-32 rounded bg-muted" />
                  <div className="mt-2 h-3 w-20 rounded bg-muted" />
                </div>
              </div>
              <div className="mt-4 h-12 rounded bg-muted" />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="h-16 rounded-lg bg-muted" />
                <div className="h-16 rounded-lg bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : servers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <Plus className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">
            No servers configured
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first MCP server to get started
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Add Server
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {servers.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              onUpdate={fetchServers}
            />
          ))}
        </div>
      )}

      {/* Server Form Modal */}
      {showForm && (
        <ServerForm
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            fetchServers();
          }}
        />
      )}
    </div>
  );
}
