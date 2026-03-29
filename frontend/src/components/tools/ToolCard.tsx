"use client";

import { Wrench, Server, ChevronRight } from "lucide-react";
import type { Tool } from "@/lib/types";

interface ToolCardProps {
  tool: Tool;
  onSelect: (tool: Tool) => void;
}

const typeColors: Record<string, string> = {
  github: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  database: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  filesystem: "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

export default function ToolCard({ tool, onSelect }: ToolCardProps) {
  const requiredParams = tool.inputSchema?.required || [];
  const allParams = Object.keys(tool.inputSchema?.properties || {});

  return (
    <button
      onClick={() => onSelect(tool)}
      className="group w-full rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-primary/30 hover:shadow-lg"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Wrench className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <code className="text-sm font-bold text-foreground">
              {tool.name}
            </code>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Server className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {tool.serverName}
              </span>
            </div>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {tool.description}
      </p>

      <div className="mt-4 flex items-center gap-2">
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${typeColors[tool.serverType] || "bg-muted text-muted-foreground"}`}
        >
          {tool.serverType}
        </span>
        {allParams.length > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {allParams.length} param{allParams.length !== 1 ? "s" : ""}
            {requiredParams.length > 0 && (
              <span> ({requiredParams.length} required)</span>
            )}
          </span>
        )}
      </div>
    </button>
  );
}
