"use client";

import { useEffect, useState } from "react";
import StatsCards from "@/components/dashboard/StatsCards";
import ServerStatus from "@/components/dashboard/ServerStatus";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import { api } from "@/lib/api";
import type { DashboardStats } from "@/lib/types";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
    // Poll every 15 seconds
    const interval = setInterval(fetchDashboard, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboard = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.warn("Dashboard fetch failed:", error instanceof Error ? error.message : "Unknown error");
      if (!stats) {
        setStats({
          activeConnections: 0,
          totalToolCalls: 0,
          totalTools: 0,
          errorRate: 0,
          recentActivity: [],
          serverStatuses: [],
        });
      }
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your MCP DevBridge platform and connected servers
        </p>
      </div>

      <StatsCards stats={stats} loading={loading} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ServerStatus
          servers={stats?.serverStatuses || []}
          loading={loading}
        />
        <ActivityFeed
          activities={stats?.recentActivity || []}
          loading={loading}
        />
      </div>

      {/* Architecture Info Card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground">
          About MCP DevBridge
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          MCP DevBridge is a Universal Developer Tool Integration Platform that
          implements the{" "}
          <span className="font-medium text-foreground">
            Model Context Protocol (MCP)
          </span>
          . It provides a standardized way for AI assistants and LLMs to connect
          to developer tools like GitHub, databases, and file systems through a
          unified JSON-RPC 2.0 protocol. The platform consists of a Next.js
          dashboard, a .NET 9 API gateway, and multiple TypeScript MCP server
          implementations.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs font-medium text-primary">Frontend</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Next.js 14, TypeScript, Tailwind CSS
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs font-medium text-primary">Backend</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              .NET 9 Web API, Entity Framework, SQLite
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs font-medium text-primary">MCP Servers</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              TypeScript, JSON-RPC 2.0, Express
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
