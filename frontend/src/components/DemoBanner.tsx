"use client";

import { isDemoMode } from "@/lib/api";

export default function DemoBanner() {
  if (!isDemoMode()) return null;

  return (
    <div className="bg-amber-900/30 border-b border-amber-700/50 px-4 py-2 text-center text-sm text-amber-200">
      <strong>Demo Mode</strong> — Backend not connected. Showing sample data.{" "}
      <a
        href="https://github.com/MusaevAkobirSanokulUgli/MCP-DevBridge#quick-start"
        target="_blank"
        rel="noopener noreferrer"
        className="underline font-medium hover:text-amber-100"
      >
        Run with Docker Compose
      </a>{" "}
      for full MCP functionality.
    </div>
  );
}
