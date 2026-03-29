"use client";

import { Server, Wrench, Activity, AlertTriangle } from "lucide-react";
import type { DashboardStats } from "@/lib/types";

interface StatsCardsProps {
  stats: DashboardStats | null;
  loading: boolean;
}

export default function StatsCards({ stats, loading }: StatsCardsProps) {
  const cards = [
    {
      label: "Active Connections",
      value: stats?.activeConnections ?? 0,
      icon: Server,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      description: "MCP servers online",
    },
    {
      label: "Total Tool Calls",
      value: stats?.totalToolCalls ?? 0,
      icon: Activity,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      description: "All-time invocations",
    },
    {
      label: "Available Tools",
      value: stats?.totalTools ?? 0,
      icon: Wrench,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      description: "Across all servers",
    },
    {
      label: "Error Rate",
      value: `${stats?.errorRate ?? 0}%`,
      icon: AlertTriangle,
      color:
        (stats?.errorRate ?? 0) > 5 ? "text-red-500" : "text-emerald-500",
      bgColor:
        (stats?.errorRate ?? 0) > 5 ? "bg-red-500/10" : "bg-emerald-500/10",
      description: "Last 24 hours",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-border bg-card p-6"
          >
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="mt-3 h-8 w-16 rounded bg-muted" />
            <div className="mt-2 h-3 w-32 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/20 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {card.label}
              </p>
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.bgColor}`}
              >
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </div>
            <p className="mt-2 text-3xl font-bold text-foreground">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {card.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
