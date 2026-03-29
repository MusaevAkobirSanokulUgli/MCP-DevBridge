"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { api } from "@/lib/api";
import type { ServerCreateRequest } from "@/lib/types";

interface ServerFormProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function ServerForm({ onClose, onCreated }: ServerFormProps) {
  const [formData, setFormData] = useState<ServerCreateRequest>({
    name: "",
    type: "github",
    endpoint: "http://localhost:3001",
    description: "",
    configuration: {},
  });
  const [configKey, setConfigKey] = useState("");
  const [configValue, setConfigValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const endpointDefaults: Record<string, string> = {
    github: "http://localhost:3001",
    database: "http://localhost:3002",
    filesystem: "http://localhost:3003",
  };

  const handleTypeChange = (type: string) => {
    setFormData({
      ...formData,
      type,
      endpoint: endpointDefaults[type] || "http://localhost:3001",
    });
  };

  const addConfig = () => {
    if (!configKey.trim()) return;
    setFormData({
      ...formData,
      configuration: { ...formData.configuration, [configKey]: configValue },
    });
    setConfigKey("");
    setConfigValue("");
  };

  const removeConfig = (key: string) => {
    const newConfig = { ...formData.configuration };
    delete newConfig[key];
    setFormData({ ...formData, configuration: newConfig });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Server name is required");
      return;
    }
    if (!formData.endpoint.trim()) {
      setError("Endpoint URL is required");
      return;
    }

    setSubmitting(true);
    try {
      await api.createServer(formData);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create server");
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Register New MCP Server
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Server Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="My GitHub Server"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>

          {/* Type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Server Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["github", "database", "filesystem"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeChange(type)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    formData.type === type
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Endpoint */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Endpoint URL
            </label>
            <input
              type="text"
              value={formData.endpoint}
              onChange={(e) =>
                setFormData({ ...formData, endpoint: e.target.value })
              }
              placeholder="http://localhost:3001"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe what this server does..."
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>

          {/* Configuration */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Configuration
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={configKey}
                onChange={(e) => setConfigKey(e.target.value)}
                placeholder="Key"
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none"
              />
              <input
                type="text"
                value={configValue}
                onChange={(e) => setConfigValue(e.target.value)}
                placeholder="Value"
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none"
              />
              <button
                type="button"
                onClick={addConfig}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-input text-muted-foreground hover:bg-accent"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {Object.keys(formData.configuration).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(formData.configuration).map(([key, value]) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs"
                  >
                    <span className="font-medium">{key}</span>: {value}
                    <button
                      type="button"
                      onClick={() => removeConfig(key)}
                      className="ml-1 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Server"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
