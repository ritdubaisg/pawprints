"use client";

import React from "react";
import { Check, CircleDashed, CircleDot, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { StageProgress, describeStageGap } from "@/lib/review-stages";

function StageIcon({ progress }: { progress: StageProgress }) {
  if (progress.blocked) {
    return <TriangleAlert className="h-4 w-4 text-destructive" />;
  }
  if (progress.status === "complete") {
    return (
      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
    );
  }
  if (progress.status === "current") {
    return <CircleDot className="h-4 w-4 text-amber-600 dark:text-amber-500" />;
  }
  return <CircleDashed className="h-4 w-4 text-muted-foreground/50" />;
}

/**
 * The pipeline rendered as a checklist, one row per stage — the same shape a
 * pull request uses for its checks, so "what is still blocking this" is
 * answerable at a glance rather than by counting names.
 */
export function ReviewProgressPanel({ stages }: { stages: StageProgress[] }) {
  return (
    <ol className="divide-y border-t">
      {stages.map((progress) => {
        const approverNames = progress.approvals.map(
          (review) => review.reviewer.name,
        );

        return (
          <li
            key={progress.stage.key}
            className={cn(
              "flex gap-3 px-4 py-3",
              progress.status === "upcoming" && "opacity-60",
            )}
          >
            <span className="mt-0.5 shrink-0">
              <StageIcon progress={progress} />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">
                  {progress.stage.name}
                </span>
                <Badge
                  variant="outline"
                  className="h-5 px-1.5 text-[11px] font-normal tabular-nums"
                >
                  {progress.approvalCount} of {progress.stage.minApprovals}
                </Badge>
                {progress.status === "current" && (
                  <Badge className="h-5 bg-amber-500 px-1.5 text-[11px] font-normal text-white">
                    In review
                  </Badge>
                )}
              </div>

              <p
                className={cn(
                  "mt-0.5 text-xs",
                  progress.blocked
                    ? "text-destructive"
                    : "text-muted-foreground",
                )}
              >
                {progress.status === "upcoming"
                  ? progress.stage.description
                  : describeStageGap(progress)}
              </p>

              {(approverNames.length > 0 ||
                progress.assignments.length > 0) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {approverNames.map((name) => (
                    <Badge
                      key={`approved-${name}`}
                      variant="outline"
                      className="h-5 gap-1 rounded-full px-2 text-[11px] font-normal"
                    >
                      <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-500" />
                      {name}
                    </Badge>
                  ))}
                  {progress.awaitingAssignees.map((entry) => (
                    <Badge
                      key={`awaiting-${entry.id}`}
                      variant="outline"
                      className="h-5 gap-1 rounded-full border-dashed px-2 text-[11px] font-normal text-muted-foreground"
                    >
                      <CircleDashed className="h-3 w-3" />
                      {entry.assignee.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default ReviewProgressPanel;
