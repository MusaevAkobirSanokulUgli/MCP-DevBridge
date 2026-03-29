"use client";

import { useState } from "react";
import {
  Server,
  Github,
  Database,
  HardDrive,
  Play,
  Square,
  RefreshCw,
  Trash2,
  Settings2,
} from "lucide-react";
import { api } from "@/lib/api";
import type { McpServer } from "@/lib/types";

interface ServerCardProps {
  server: McpServer;
  onUpdate: () => void;
}

const serverIcons: Record<string, typeof Server> = {
  github: Github,
  database: Database,
  filesystem: HardDrive,
};

const typeLabels: Record<string, string> = {
  github: "GitHub",
  database: "Database",
  filesystem: "FileSystem",
};

export default function ServerCard({ server, onUpdate }: ServerCardProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const Icon = serverIcons[server.type] || Server;

  const handleStart = async () => {
    setLoading("start");
    try {
      await api.startServer(server.id);
      onUpdate();
    } catch (error) {
      console.error("Failed to start server:", error);
    }
    setLoading(null);
  };

  const handleStop = async () => {
    setLoading("stop");
    try {
      await api.stopServer(server.id);
      onUpdate();
    } catch (error) {
      console.error("Failed to stop server:", error);
    }
    setLoading(null);
  };

  const handleRefresh = async () => {
    setLoading("refresh");
    try {
      await api.refreshServerTools(server.id);
      onUpdate();
    } catch (error) {
      console.error("Failed to refresh tools:", error);
    }
    setLoading(null);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete server "${server.name}"? This action cannot be undone.`))
      return;

    setLoading("delete");
    try {
      await api.deleteServer(server.id);
      onUpdate();
    } catch (error) {
      console.error("Failed to delete server:", error);
    }
    setLoading(null);
  };

  const statusColor = {
    active: "border-green-500/30 bg-green-500/5",
    inactive: "border-border bg-card",
    error: "border-red-500/30 bg-red-500/5",
  };

  const statusBadge = {
    active: "bg-green-500/10 text-green-500",
    inactive: "bg-gray-400/10 text-gray-400",
    error: "bg-red-500/10 text-red-500",
  };

  const statusDot = {
    active: "bg-green-500 animate-pulse-slow",
    inactive: "bg-gray-400",
    error: "bg-red-500",
  };

  return (
    <div
      className={`group rounded-xl border-2 p-6 transition-all hover:shadow-lg ${statusColor[server.status]}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <Icon className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {server.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {typeLabels[server.type] || server.type} Server
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge[server.status]}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${statusDot[server.status]}`}
          />
          {server.status.charAt(0).toUpperCase() + server.status.slice(1)}
        </span>
      </div>

      {/* Description */}
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        {server.description || "No description provided."}
      </p>

      {/* Info Grid */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Endpoint
          </p>
          <p className="mt-0.5 truncate text-xs font-mono text-foreground">
            {server.endpoint}
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Tools
          </p>
          <p className="mt-0.5 text-xs font-semibold text-foreground">
            {server.toolCount} registered
          </p>
        </div>
      </div>

      {/* Configuration */}
      {Object.keys(server.configuration).length > 0 && (
        <div className="mt-3 flex items-center gap-1">
          <Settings2 className="h-3 w-3 text-muted-foreground" />
          <div className="flex flex-wrap gap-1">
            {Object.entries(server.configuration).map(([key, value]) => (
              <span
                key={key}
                className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {key}: {value}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-5 flex items-center gap-2 border-t border-border pt-4">
        {server.status === "active" ? (
          <button
            onClick={handleStop}
            disabled={loading !== null}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/20 disabled:opacity-50"
          >
            <Square className="h-3 w-3" />
            Stop
          </button>
        ) : (
          <button
            onClick={handleStart}
            disabled={loading !== null}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-2 text-xs font-medium text-green-500 transition-colors hover:bg-green-500/20 disabled:opacity-50"
          >
            <Play className="h-3 w-3" />
            Start
          </button>
        )}

        <button
          onClick={handleRefresh}
          disabled={loading !== null || server.status !== "active"}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-500 transition-colors hover:bg-blue-500/20 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3 w-3 ${loading === "refresh" ? "animate-spin" : ""}`}
          />
          Sync Tools
        </button>

        <div className="flex-1" />

        <button
          onClick={handleDelete}
          disabled={loading !== null}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Updated timestamp */}
      <p className="mt-2 text-[10px] text-muted-foreground">
        Last updated: {new Date(server.updatedAt).toLocaleString()}
      </p>
    </div>
  );
}
