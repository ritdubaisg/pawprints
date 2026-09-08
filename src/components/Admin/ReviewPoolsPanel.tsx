"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, TriangleAlert, UserCog, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  setStagePool,
  type ReviewCandidate,
  type ReviewPool,
} from "@/app/review-actions";
import { AdminToolbar } from "./AdminTableShell";

interface ReviewPoolsPanelProps {
  pools: ReviewPool[];
  candidates: ReviewCandidate[];
}

function sameMembers(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

/**
 * The reviewer lists behind the review pipeline.
 *
 * Being on a list is what makes someone a reviewer for that stage — there is
 * no separate permission for it. Stages that require assignment draw their
 * per-petition assignees from this same list, so an empty list here means
 * petitions cannot clear that stage at all.
 */
export function ReviewPoolsPanel({ pools, candidates }: ReviewPoolsPanelProps) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, string[] | undefined>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  const committed = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const pool of pools) {
      map[pool.stageKey] = pool.members.map((member) => member.id);
    }
    return map;
  }, [pools]);

  // Drop a draft once the refreshed props agree with it.
  useEffect(() => {
    setDrafts((previous) => {
      let changed = false;
      const next = { ...previous };
      for (const key of Object.keys(previous)) {
        const draft = previous[key];
        if (draft && sameMembers(draft, committed[key] ?? [])) {
          delete next[key];
          changed = true;
        }
      }
      return changed ? next : previous;
    });
  }, [committed]);

  const nameById = useMemo(() => {
    const map = new Map<string, ReviewCandidate>();
    for (const candidate of candidates) map.set(candidate.id, candidate);
    for (const pool of pools) {
      for (const member of pool.members) {
        if (!map.has(member.id)) map.set(member.id, member);
      }
    }
    return map;
  }, [candidates, pools]);

  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return candidates;
    return candidates.filter(
      (candidate) =>
        candidate.name.toLowerCase().includes(query) ||
        (candidate.email ?? "").toLowerCase().includes(query),
    );
  }, [candidates, search]);

  const selectionFor = (stageKey: string) =>
    drafts[stageKey] ?? committed[stageKey] ?? [];

  const toggle = (stageKey: string, userId: string) => {
    setDrafts((previous) => {
      const current = previous[stageKey] ?? committed[stageKey] ?? [];
      const next = current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId];
      return { ...previous, [stageKey]: next };
    });
  };

  const commit = async (stageKey: string, ids: string[]) => {
    if (sameMembers(ids, committed[stageKey] ?? [])) return;

    setSaving((previous) => ({ ...previous, [stageKey]: true }));
    try {
      const result = await setStagePool(stageKey, ids);
      const parts: string[] = [];
      if (result.added.length) parts.push(`${result.added.length} added`);
      if (result.removed.length) parts.push(`${result.removed.length} removed`);
      toast.success(parts.join(", ") || "Reviewer list updated");
      router.refresh();
    } catch (error: any) {
      setDrafts((previous) => {
        const next = { ...previous };
        delete next[stageKey];
        return next;
      });
      toast.error(error?.message || "Could not update the list");
    } finally {
      setSaving((previous) => ({ ...previous, [stageKey]: false }));
    }
  };

  const removeOne = (stageKey: string, userId: string) => {
    const next = selectionFor(stageKey).filter((id) => id !== userId);
    setDrafts((previous) => ({ ...previous, [stageKey]: next }));
    void commit(stageKey, next);
  };

  return (
    <>
      <AdminToolbar>
        <p className="text-sm text-muted-foreground">
          Membership decides who can approve each stage. Only staff and
          superadmins can be added — reviewers need access to the review
          dashboard.
        </p>
      </AdminToolbar>

      <div className="min-h-0 flex-1 overflow-auto px-3 py-4 sm:px-4 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-2">
          {pools.map((pool) => {
            const selected = selectionFor(pool.stageKey);
            const isSaving = !!saving[pool.stageKey];
            const isDirty =
              drafts[pool.stageKey] !== undefined &&
              !sameMembers(selected, committed[pool.stageKey] ?? []);
            const short = selected.length < pool.minApprovals;

            return (
              <div
                key={pool.stageKey}
                className="overflow-hidden rounded-lg border"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{pool.stageName}</h3>
                      {isSaving && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Needs {pool.minApprovals}{" "}
                      {pool.minApprovals === 1 ? "approval" : "approvals"}
                      {pool.requiresAssignment
                        ? " · one member must be assigned per petition"
                        : " · applies to every petition"}
                    </p>
                  </div>

                  <DropdownMenu
                    onOpenChange={(open) => {
                      if (!open) {
                        setSearch("");
                        void commit(pool.stageKey, selectionFor(pool.stageKey));
                      }
                    }}
                  >
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Edit list
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-72"
                      // Typing in the search box must not be swallowed by the
                      // menu's own type-ahead.
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <DropdownMenuLabel>
                        {pool.stageName} reviewers
                      </DropdownMenuLabel>
                      <div className="px-2 pb-2">
                        <Input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Search staff…"
                          className="h-8"
                        />
                      </div>
                      <DropdownMenuSeparator />
                      <div className="max-h-64 overflow-y-auto">
                        {filteredCandidates.length === 0 ? (
                          <div className="px-2 py-3 text-sm text-muted-foreground">
                            No staff accounts match. Grant staff access from the
                            Users tab first.
                          </div>
                        ) : (
                          filteredCandidates.map((candidate) => (
                            <DropdownMenuItem
                              key={candidate.id}
                              onSelect={(event) => {
                                event.preventDefault();
                                toggle(pool.stageKey, candidate.id);
                              }}
                            >
                              <span className="min-w-0 flex-1 truncate">
                                {candidate.name}
                              </span>
                              {selected.includes(candidate.id) && (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </DropdownMenuItem>
                          ))
                        )}
                      </div>
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
                </div>

                <div className="px-4 py-3">
                  {short && (
                    <p className="mb-3 flex items-start gap-2 text-xs text-amber-600 dark:text-amber-500">
                      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        {selected.length === 0
                          ? "Empty — no petition can clear this stage."
                          : `Only ${selected.length} on the list but ${pool.minApprovals} approvals are needed, so this stage can never pass.`}
                      </span>
                    </p>
                  )}

                  {selected.length === 0 ? (
                    <div className="flex flex-col items-center gap-1.5 py-6 text-center">
                      <UserCog className="h-6 w-6 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">
                        Nobody on this list yet
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {selected.map((userId) => {
                        const member = nameById.get(userId);
                        return (
                          <li
                            key={userId}
                            className="flex items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted/50"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate">
                                {member?.name ?? "Unknown user"}
                              </span>
                              {member?.email && (
                                <span className="block truncate text-xs text-muted-foreground">
                                  {member.email}
                                </span>
                              )}
                            </span>
                            {member?.isSuperAdmin && (
                              <Badge
                                variant="outline"
                                className="h-5 px-1.5 text-[10px]"
                              >
                                Superadmin
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground"
                              aria-label={`Remove ${member?.name ?? "user"}`}
                              disabled={isSaving}
                              onClick={() => removeOne(pool.stageKey, userId)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default ReviewPoolsPanel;
