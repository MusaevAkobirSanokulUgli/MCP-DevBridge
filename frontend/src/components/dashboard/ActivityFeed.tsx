"use client";

import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import type { ToolInvocation } from "@/lib/types";

interface ActivityFeedProps {
  activities: ToolInvocation[];
  loading: boolean;
}

export default function ActivityFeed({
  activities,
  loading,
}: ActivityFeedProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-5">
          <h3 className="text-sm font-semibold text-foreground">
            Recent Activity
          </h3>
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse p-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="flex-1">
                  <div className="h-4 w-40 rounded bg-muted" />
                  <div className="mt-1 h-3 w-24 rounded bg-muted" />
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
        <h3 className="text-sm font-semibold text-foreground">
          Recent Activity
        </h3>
        <Link
          href="/logs"
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
      <div className="divide-y divide-border">
        {activities.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No recent activity
          </div>
        ) : (
          activities.map((activity) => {
            const statusIcon =
              activity.status === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : activity.status === "error" ? (
                <XCircle className="h-4 w-4 text-red-500" />
              ) : (
                <Clock className="h-4 w-4 text-yellow-500" />
              );

            return (
              <div
                key={activity.id}
                className="flex items-center gap-3 p-4 transition-colors hover:bg-accent/50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  {statusIcon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-semibold text-foreground">
                      {activity.toolName}
                    </code>
                    <span className="text-[10px] text-muted-foreground">
                      via {activity.serverName}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{activity.durationMs}ms</span>
                    <span>-</span>
                    <span>{formatTime(activity.timestamp)}</span>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    activity.status === "success"
                      ? "bg-green-500/10 text-green-500"
                      : activity.status === "error"
                        ? "bg-red-500/10 text-red-500"
                        : "bg-yellow-500/10 text-yellow-500"
                  }`}
                >
                  {activity.status}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
