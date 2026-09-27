import { Check } from "lucide-react";

import { TIMELINE_STAGES, formatTime, type RequestStatus } from "@/lib/eco";
import type { StatusHistoryRow } from "@/lib/requests";
import { cn } from "@/lib/utils";

export function RequestTimeline({
  status,
  history = [],
}: {
  status: RequestStatus;
  history?: StatusHistoryRow[];
}) {
  if (status === "cancelled") {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        This request was cancelled. No collection is scheduled.
      </div>
    );
  }

  const currentIndex = TIMELINE_STAGES.findIndex((s) => s.status === status);

  return (
    <ol className="space-y-0">
      {TIMELINE_STAGES.map((stage, index) => {
        const done = index <= currentIndex;
        const current = index === currentIndex;
        const stamp = history.find((h) => h.status === stage.status);
        const last = index === TIMELINE_STAGES.length - 1;

        return (
          <li key={stage.status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-xs",
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : <span>{index + 1}</span>}
              </span>
              {!last ? (
                <span className={cn("w-0.5 flex-1", done ? "bg-primary" : "bg-border")} />
              ) : null}
            </div>
            <div className={cn("min-w-0 pb-6", last && "pb-0")}>
              <p
                className={cn(
                  "text-sm font-semibold",
                  current ? "text-primary" : done ? "text-primary-deep" : "text-muted-foreground",
                )}
              >
                {stage.label}
                {current ? " • current stage" : ""}
              </p>
              {stamp ? (
                <p className="text-xs text-muted-foreground">{formatTime(stamp.created_at)}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
