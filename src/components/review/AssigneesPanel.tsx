"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Loader2,
  Plus,
  TriangleAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PetitionAssignmentEntry,
  PetitionReviewEntry,
  ReviewDecision,
} from "@/types/petition";
import { REVIEW_STAGES } from "@/lib/review-stages";
import {
  getReviewCandidates,
  setStageAssignees,
  type ReviewCandidate,
} from "@/app/review-actions";

interface AssigneesPanelProps {
  petitionId: number;
  assignments: PetitionAssignmentEntry[];
  reviews: PetitionReviewEntry[];
  canManage: boolean;
}

/**
 * Where one assignee stands. Each state gets its own icon shape as well as a
 * colour, and a text label in the tooltip — the status has to survive being
 * read by someone who cannot separate the hues.
 */
const REVIEWER_STATUS: Record<
  "approved" | "changes" | "pending",
  { label: string; icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  approved: {
    label: "Approved",
    icon: CircleCheck,
    className: "text-emerald-600 dark:text-emerald-500",
  },
  changes: {
    label: "Requested changes",
    icon: CircleAlert,
    className: "text-destructive",
  },
  pending: {
    label: "Waiting on them",
    icon: CircleDashed,
    className: "text-muted-foreground/60",
  },
};

/**
 * The panel's icon buttons.
 *
 * `-m-1` cancels the `p-1`, so the glyph lands where a bare icon would while
 * the hit target stays 22px. Without it the row's X is centred inside its own
 * padding and sits inboard of the header's +, which reads as a misalignment
 * because it is one.
 */
const ICON_BUTTON =
  "-m-1 shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50";

function sameMembers(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

/**
 * Per-petition assignment.
 *
 * Only stages that require it appear here. A stage like Student Government
 * draws on a fixed list that applies to every petition, so there is nothing
 * to choose — showing an empty assignment box for it would imply otherwise.
 *
 * Ticking names only edits local state; the whole list for a stage is sent in
 * one call when the menu closes. Staffing a petition used to be one request
 * and one full page refresh per person.
 */
export function AssigneesPanel({
  petitionId,
  assignments,
  reviews,
  canManage,
}: AssigneesPanelProps) {
  const router = useRouter();
  /** Stage pool members, fetched per stage on first menu open. */
  const [candidates, setCandidates] = useState<
    Record<string, ReviewCandidate[] | null>
  >({});
  /** Per-stage selection that has not been sent yet, or is still in flight. */
  const [drafts, setDrafts] = useState<Record<number, string[] | undefined>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});

  const assignableStages = REVIEW_STAGES.map((stage, index) => ({
    stage,
    index,
  })).filter(({ stage }) => stage.requiresAssignment);

  /** Decision by stage and reviewer, for the status marker on each row. */
  const decisionAt = useMemo(() => {
    const map = new Map<string, ReviewDecision>();
    for (const review of reviews) {
      map.set(`${review.stage}:${review.reviewer.id}`, review.decision);
    }
    return map;
  }, [reviews]);

  const committedIds = useCallback(
    (stage: number) =>
      assignments
        .filter((entry) => entry.stage === stage)
        .map((entry) => entry.assignee.id),
    [assignments],
  );

  // Once the server round trip lands and props catch up, the draft has served
  // its purpose — drop it so the real data drives the list again.
  useEffect(() => {
    setDrafts((previous) => {
      let changed = false;
      const next = { ...previous };
      for (const key of Object.keys(previous)) {
        const stage = Number(key);
        const draft = previous[stage];
        if (draft && sameMembers(draft, committedIds(stage))) {
          delete next[stage];
          changed = true;
        }
      }
      return changed ? next : previous;
    });
  }, [committedIds]);

  /** Names for ids that may not have an assignment row yet. */
  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of assignments) {
      map.set(entry.assignee.id, entry.assignee.name);
    }
    for (const list of Object.values(candidates)) {
      for (const candidate of list ?? []) {
        map.set(candidate.id, candidate.name);
      }
    }
    return map;
  }, [assignments, candidates]);

  // Fetched on first open rather than with the page: most visits never touch
  // the menu, and the list is only useful to people who can assign.
  const loadCandidates = async (stageKey: string) => {
    if (candidates[stageKey] !== undefined) return;
    setCandidates((previous) => ({ ...previous, [stageKey]: null }));
    try {
      const list = await getReviewCandidates(stageKey);
      setCandidates((previous) => ({ ...previous, [stageKey]: list }));
    } catch (error: any) {
      toast.error(error?.message || "Could not load reviewers");
      setCandidates((previous) => ({ ...previous, [stageKey]: [] }));
    }
  };

  const selectionFor = (stage: number) => drafts[stage] ?? committedIds(stage);

  const toggle = (stage: number, userId: string) => {
    setDrafts((previous) => {
      const current = previous[stage] ?? committedIds(stage);
      const next = current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId];
      return { ...previous, [stage]: next };
    });
  };

  /**
   * Sends the finished list for one stage in a single call. The optimistic
   * draft stays on screen while it is in flight, and is dropped either when
   * the refreshed props agree with it or when the call fails.
   */
  const commit = async (stage: number, ids: string[]) => {
    if (sameMembers(ids, committedIds(stage))) return;

    setSaving((previous) => ({ ...previous, [stage]: true }));
    try {
      const result = await setStageAssignees(petitionId, stage, ids);
      const parts: string[] = [];
      if (result.added.length) parts.push(`${result.added.length} assigned`);
      if (result.removed.length) parts.push(`${result.removed.length} removed`);
      toast.success(parts.join(", ") || "Reviewers updated");
      // Pulls the new assignment events onto the timeline.
      router.refresh();
    } catch (error: any) {
      // Roll the optimistic list back to whatever the server still believes.
      setDrafts((previous) => {
        const next = { ...previous };
        delete next[stage];
        return next;
      });
      toast.error(error?.message || "Could not update reviewers");
    } finally {
      setSaving((previous) => ({ ...previous, [stage]: false }));
    }
  };

  const removeOne = (stage: number, userId: string) => {
    const next = selectionFor(stage).filter((id) => id !== userId);
    setDrafts((previous) => ({ ...previous, [stage]: next }));
    void commit(stage, next);
  };

  return (
    <div className="space-y-3">
      {assignableStages.map(({ stage, index }) => {
        const selected = selectionFor(index);
        const isSaving = !!saving[index];
        const isDirty =
          drafts[index] !== undefined &&
          !sameMembers(selected, committedIds(index));
        const pool = candidates[stage.key];

        return (
          <div key={stage.key} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                {stage.name}
                {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
              </span>
              {canManage && (
                <DropdownMenu
                  onOpenChange={(open) => {
                    if (open) {
                      loadCandidates(stage.key);
                    } else {
                      // One request for the whole selection, on close.
                      void commit(index, selectionFor(index));
                    }
                  }}
                >
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Assign reviewers to ${stage.name}`}
                      className={ICON_BUTTON}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="max-h-72 w-64 overflow-y-auto"
                  >
                    <DropdownMenuLabel>Assign to {stage.name}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {pool === null || pool === undefined ? (
                      <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Loading…
                      </div>
                    ) : pool.length === 0 ? (
                      <div className="px-2 py-3 text-sm text-muted-foreground">
                        The {stage.name} list is empty. A superadmin sets it up
                        in the admin panel.
                      </div>
                    ) : (
                      pool.map((candidate) => (
                        <DropdownMenuItem
                          key={candidate.id}
                          // Keeps the menu open so several can be picked in
                          // one go before anything is sent.
                          onSelect={(event) => {
                            event.preventDefault();
                            toggle(index, candidate.id);
                          }}
                        >
                          <span className="flex-1 truncate">
                            {candidate.name}
                          </span>
                          {selected.includes(candidate.id) && (
                            <Check className="h-3.5 w-3.5" />
                          )}
                        </DropdownMenuItem>
                      ))
                    )}
                    {isDirty && (
                      <>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">
                          Close this menu to save.
                        </div>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {selected.length === 0 ? (
              <p className="flex items-start gap-1.5 text-sm text-amber-600 dark:text-amber-500">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Required — this stage cannot pass until someone is assigned.
                </span>
              </p>
            ) : (
              <ul className="space-y-1">
                {selected.map((userId) => {
                  const decision = decisionAt.get(`${index}:${userId}`);
                  const status =
                    REVIEWER_STATUS[
                      decision === "APPROVE"
                        ? "approved"
                        : decision === "CHANGES_REQUESTED"
                          ? "changes"
                          : "pending"
                    ];
                  const StatusIcon = status.icon;
                  const name = nameById.get(userId) ?? "Unknown reviewer";

                  return (
                    <li
                      key={userId}
                      className="flex items-center gap-2 text-sm"
                      // Fixed-height rows keep the remove button on one
                      // vertical line whatever the status marker is.
                    >
                      <StatusIcon
                        className={`h-3.5 w-3.5 shrink-0 ${status.className}`}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate" title={name}>
                        {name}
                        <span className="sr-only"> — {status.label}</span>
                      </span>
                      <span className="text-[10px] whitespace-nowrap text-muted-foreground">
                        {status.label}
                      </span>
                      {canManage ? (
                        <button
                          type="button"
                          className={ICON_BUTTON}
                          aria-label={`Remove ${name}`}
                          disabled={isSaving}
                          onClick={() => removeOne(index, userId)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}

      {!canManage && (
        <p className="text-xs text-muted-foreground">
          Only reviewers with the assign permission can change this.
        </p>
      )}
    </div>
  );
}

export default AssigneesPanel;
