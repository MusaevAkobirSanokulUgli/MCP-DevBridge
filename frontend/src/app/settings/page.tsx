"use client";

import { useState, useEffect } from "react";
import {
  Save,
  Key,
  Globe,
  Database,
  Shield,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import type { SystemHealth } from "@/lib/types";

interface SettingsState {
  apiUrl: string;
  githubToken: string;
  dbPath: string;
  sandboxDir: string;
  autoHealthCheck: boolean;
  healthCheckInterval: string;
  logRetentionDays: string;
  darkMode: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>({
    apiUrl:
      typeof window !== "undefined"
        ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
        : "http://localhost:5000",
    githubToken: "",
    dbPath: "sample.db",
    sandboxDir: "./sandbox",
    autoHealthCheck: true,
    healthCheckInterval: "30",
    logRetentionDays: "30",
    darkMode: true,
  });
  const [saved, setSaved] = useState(false);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const stored = localStorage.getItem("mcp-devbridge-settings");
    if (stored) {
      try {
        setSettings({ ...settings, ...JSON.parse(stored) });
      } catch {
        // Use defaults
      }
    }
    checkHealth();
  }, []);

  const checkHealth = async () => {
    setChecking(true);
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch {
      setHealth({
        status: "unhealthy",
        uptime: 0,
        activeServers: 0,
        totalServers: 0,
        recentErrors: 0,
        lastChecked: new Date().toISOString(),
        version: "1.0.0",
      });
    }
    setChecking(false);
  };

  const handleSave = () => {
    localStorage.setItem("mcp-devbridge-settings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleChange = (key: keyof SettingsState, value: string | boolean) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure API connections, server endpoints, and platform preferences
        </p>
      </div>

      {/* Success Banner */}
      {saved && (
        <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-500 animate-fade-in">
          <CheckCircle2 className="h-4 w-4" />
          Settings saved successfully
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Settings */}
        <div className="space-y-6 lg:col-span-2">
          {/* API Connection */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">
                API Connection
              </h3>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Backend API URL
                </label>
                <input
                  type="text"
                  value={settings.apiUrl}
                  onChange={(e) => handleChange("apiUrl", e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  The URL of the .NET 8 API gateway
                </p>
              </div>
            </div>
          </div>

          {/* API Keys */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">
                API Keys
              </h3>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  GitHub Personal Access Token
                </label>
                <input
                  type="password"
                  value={settings.githubToken}
                  onChange={(e) =>
                    handleChange("githubToken", e.target.value)
                  }
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Required for GitHub MCP server operations. Generate at
                  github.com/settings/tokens.
                </p>
              </div>
            </div>
          </div>

          {/* Server Endpoints */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">
                Server Configuration
              </h3>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Database Path
                </label>
                <input
                  type="text"
                  value={settings.dbPath}
                  onChange={(e) => handleChange("dbPath", e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Path to the SQLite database for the Database MCP server
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Sandbox Directory
                </label>
                <input
                  type="text"
                  value={settings.sandboxDir}
                  onChange={(e) =>
                    handleChange("sandboxDir", e.target.value)
                  }
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Root directory for FileSystem MCP server operations
                </p>
              </div>
            </div>
          </div>

          {/* Platform Settings */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">
                Platform Settings
              </h3>
            </div>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Auto Health Check
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Automatically check server health at regular intervals
                  </p>
                </div>
                <button
                  onClick={() =>
                    handleChange(
                      "autoHealthCheck",
                      !settings.autoHealthCheck
                    )
                  }
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    settings.autoHealthCheck ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform shadow-sm ${
                      settings.autoHealthCheck
                        ? "translate-x-5"
                        : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Health Check Interval (seconds)
                </label>
                <input
                  type="number"
                  value={settings.healthCheckInterval}
                  onChange={(e) =>
                    handleChange("healthCheckInterval", e.target.value)
                  }
                  min="5"
                  max="300"
                  className="w-32 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Log Retention (days)
                </label>
                <input
                  type="number"
                  value={settings.logRetentionDays}
                  onChange={(e) =>
                    handleChange("logRetentionDays", e.target.value)
                  }
                  min="1"
                  max="365"
                  className="w-32 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Save className="h-4 w-4" />
            Save Settings
          </button>
        </div>

        {/* Sidebar - System Info */}
        <div className="space-y-6">
          {/* Health Status */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                System Health
              </h3>
              <button
                onClick={checkHealth}
                disabled={checking}
                className="text-muted-foreground hover:text-foreground"
              >
                <RefreshCw
                  className={`h-4 w-4 ${checking ? "animate-spin" : ""}`}
                />
              </button>
            </div>
            {health ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2">
                  {health.status === "healthy" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span className="text-sm font-medium capitalize text-foreground">
                    {health.status}
                  </span>
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Uptime</span>
                    <span className="text-foreground">
                      {Math.floor(health.uptime / 3600)}h{" "}
                      {Math.floor((health.uptime % 3600) / 60)}m
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Servers</span>
                    <span className="text-foreground">
                      {health.activeServers}/{health.totalServers}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recent Errors</span>
                    <span
                      className={
                        health.recentErrors > 0
                          ? "text-red-500"
                          : "text-foreground"
                      }
                    >
                      {health.recentErrors}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Version</span>
                    <span className="text-foreground">{health.version}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 text-sm text-muted-foreground">
                Checking health...
              </div>
            )}
          </div>

          {/* Quick Reference */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-foreground">
              MCP Server Ports
            </h3>
            <div className="mt-3 space-y-2">
              {[
                { name: "API Gateway", port: "5000", type: ".NET 8" },
                { name: "GitHub Server", port: "3001", type: "TypeScript" },
                { name: "Database Server", port: "3002", type: "TypeScript" },
                { name: "FileSystem Server", port: "3003", type: "TypeScript" },
              ].map((item) => (
                <div
                  key={item.port}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="font-mono text-foreground">
                    :{item.port}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Documentation Links */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-foreground">
              Resources
            </h3>
            <div className="mt-3 space-y-2 text-xs">
              <a
                href="http://localhost:5000/swagger"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-primary hover:underline"
              >
                API Documentation (Swagger)
              </a>
              <a
                href="https://modelcontextprotocol.io"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-primary hover:underline"
              >
                MCP Specification
              </a>
              <a
                href="https://www.jsonrpc.org/specification"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-primary hover:underline"
              >
                JSON-RPC 2.0 Specification
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
