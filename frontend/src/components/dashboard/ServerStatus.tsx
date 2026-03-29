"use client";

import Link from "next/link";
import { Server, Github, Database, HardDrive, ExternalLink } from "lucide-react";
import type { McpServer } from "@/lib/types";

interface ServerStatusProps {
  servers: McpServer[];
  loading: boolean;
}

const serverIcons: Record<string, typeof Server> = {
  github: Github,
  database: Database,
  filesystem: HardDrive,
};

const statusStyles: Record<string, { dot: string; badge: string; label: string }> = {
  active: {
    dot: "bg-green-500",
    badge: "bg-green-500/10 text-green-500",
    label: "Active",
  },
  inactive: {
    dot: "bg-gray-400",
    badge: "bg-gray-400/10 text-gray-400",
    label: "Inactive",
  },
  error: {
    dot: "bg-red-500",
    badge: "bg-red-500/10 text-red-500",
    label: "Error",
  },
};

export default function ServerStatus({ servers, loading }: ServerStatusProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-5">
          <h3 className="text-sm font-semibold text-foreground">Server Status</h3>
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted" />
                <div className="flex-1">
                  <div className="h-4 w-32 rounded bg-muted" />
                  <div className="mt-2 h-3 w-48 rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-5">
        <h3 className="text-sm font-semibold text-foreground">Server Status</h3>
        <Link
          href="/servers"
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
      <div className="divide-y divide-border">
        {servers.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No servers configured
          </div>
        ) : (
          servers.map((server) => {
            const Icon = serverIcons[server.type] || Server;
            const style = statusStyles[server.status] || statusStyles.inactive;

            return (
              <div
                key={server.id}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-accent/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {server.name}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${style.badge}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
                      />
                      {style.label}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {server.endpoint}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    {server.toolCount}
                  </p>
                  <p className="text-[10px] text-muted-foreground">tools</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
