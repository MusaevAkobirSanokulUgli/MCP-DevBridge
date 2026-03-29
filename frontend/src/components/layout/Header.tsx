"use client";

import { useEffect, useState } from "react";
import { Bell, Moon, Sun, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import type { SystemHealth } from "@/lib/types";

export default function Header() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Default to dark mode
    document.documentElement.classList.add("dark");
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch {
      // Backend might not be running; show degraded state
      setHealth({
        status: "degraded",
        uptime: 0,
        activeServers: 0,
        totalServers: 3,
        recentErrors: 0,
        lastChecked: new Date().toISOString(),
        version: "1.0.0",
      });
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.triggerHealthCheck();
      await fetchHealth();
    } catch {
      // Silently handle
    }
    setRefreshing(false);
  };

  const statusColor = {
    healthy: "bg-green-500",
    degraded: "bg-yellow-500",
    unhealthy: "bg-red-500",
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-foreground">
          MCP DevBridge
        </h2>
        {health && (
          <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs">
            <div
              className={`h-2 w-2 rounded-full ${statusColor[health.status]}`}
            />
            <span className="capitalize text-muted-foreground">
              {health.status}
            </span>
            <span className="text-muted-foreground">
              | {health.activeServers}/{health.totalServers} servers
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleRefresh}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          title="Refresh health status"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
        </button>

        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          {health && health.recentErrors > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {health.recentErrors}
            </span>
          )}
        </button>

        <button
          onClick={toggleDarkMode}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          title="Toggle theme"
        >
          {darkMode ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      </div>
    </header>
  );
}
