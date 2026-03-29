"use client";

import { useEffect, useState } from "react";
import { Search, Filter } from "lucide-react";
import ToolCard from "@/components/tools/ToolCard";
import ToolInvoker from "@/components/tools/ToolInvoker";
import { api } from "@/lib/api";
import type { Tool } from "@/lib/types";

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    setLoading(true);
    try {
      const data = await api.getTools();
      setTools(data);
    } catch {
      setTools([]);
    }
    setLoading(false);
  };

  const filteredTools = tools.filter((tool) => {
    const matchesSearch =
      !search ||
      tool.name.toLowerCase().includes(search.toLowerCase()) ||
      tool.description.toLowerCase().includes(search.toLowerCase()) ||
      tool.serverName.toLowerCase().includes(search.toLowerCase());

    const matchesType = !filterType || tool.serverType === filterType;

    return matchesSearch && matchesType;
  });

  const serverTypes = Array.from(new Set(tools.map((t) => t.serverType)));
  const toolsByServer = filteredTools.reduce(
    (acc, tool) => {
      const key = tool.serverName;
      if (!acc[key]) acc[key] = [];
      acc[key].push(tool);
      return acc;
    },
    {} as Record<string, Tool[]>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tool Registry</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse and invoke tools available across all MCP servers
        </p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tools by name, description, or server..."
            className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
          >
            <option value="">All Types</option>
            {serverTypes.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          Showing{" "}
          <span className="font-semibold text-foreground">
            {filteredTools.length}
          </span>{" "}
          of {tools.length} tools
        </span>
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-xs text-primary hover:underline"
          >
            Clear search
          </button>
        )}
      </div>

      {/* Tools by Server */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted" />
                <div>
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="mt-1 h-3 w-16 rounded bg-muted" />
                </div>
              </div>
              <div className="mt-3 h-12 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : filteredTools.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16">
          <p className="text-sm text-muted-foreground">
            {search
              ? "No tools match your search criteria"
              : "No tools available. Start your MCP servers to register tools."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(toolsByServer).map(([serverName, serverTools]) => (
            <div key={serverName}>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                {serverName}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({serverTools.length} tool{serverTools.length !== 1 ? "s" : ""})
                </span>
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {serverTools.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    onSelect={setSelectedTool}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tool Invoker Modal */}
      {selectedTool && (
        <ToolInvoker
          tool={selectedTool}
          onClose={() => setSelectedTool(null)}
        />
      )}
    </div>
  );
}
