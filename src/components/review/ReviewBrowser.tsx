"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, UserCheck } from "lucide-react";
import { Petition, PetitionStatus } from "@/types/petition";
import { Button } from "@/components/ui/button";
import { ReviewSidebar, type ReviewView } from "./ReviewSidebar";
import { PetitionSearch } from "./PetitionSearch";
import { PetitionList, sortPetitions, type SortKey } from "./PetitionList";
import { matchesQuery, parseSearchQuery } from "@/lib/petition-search";

interface ReviewBrowserProps {
  petitions: Petition[];
  /** Petitions the signed-in reviewer is assigned to, at any stage. */
  assignedIds: number[];
}

const VIEW_TITLES: Record<ReviewView, string> = {
  all: "All petitions",
  assigned: "Assigned to me",
  recent: "Recent activity",
};

export function ReviewBrowser({
  petitions,
  assignedIds,
}: ReviewBrowserProps) {
  const [view, setView] = useState<ReviewView>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

  const parsed = useMemo(() => parseSearchQuery(query), [query]);

  /** "Recent activity" is the triage queue: everything not yet decided on. */
  const unreviewed = useMemo(
    () =>
      petitions.filter(
        (petition) => petition.status === PetitionStatus.NeedsReview,
      ),
    [petitions],
  );

  const assigned = useMemo(() => {
    const ids = new Set(assignedIds);
    return petitions.filter((petition) => ids.has(petition.id));
  }, [petitions, assignedIds]);

  const scope =
    view === "recent" ? unreviewed : view === "assigned" ? assigned : petitions;

  const visible = useMemo(() => {
    const filtered = scope.filter((petition) => matchesQuery(petition, parsed));
    // The queue is only useful oldest-waiting-first regardless of the sort
    // chosen for browsing, so it pins its own order.
    return view === "recent"
      ? sortPetitions(filtered, "oldest")
      : sortPetitions(filtered, sort);
  }, [scope, parsed, sort, view]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <ReviewSidebar
          view={view}
          onViewChange={setView}
          counts={{
            all: petitions.length,
            assigned: assigned.length,
            recent: unreviewed.length,
          }}
        />

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-bold sm:text-2xl">
              {VIEW_TITLES[view]}
            </h1>
            <Button asChild className="bg-[#F76902] text-white hover:bg-[#d55a02]">
              <Link href="/create">
                <Plus className="mr-1.5 h-4 w-4" />
                New petition
              </Link>
            </Button>
          </div>

          {view === "assigned" && assigned.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border px-6 py-16 text-center">
              <UserCheck className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">Nothing assigned to you</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Petitions appear here once someone with the assign-reviewers
                permission puts you on one.
              </p>
            </div>
          ) : (
            <>
              <PetitionSearch value={query} onChange={setQuery} />

              <PetitionList
                petitions={visible}
                allPetitions={scope}
                query={query}
                parsed={parsed}
                onQueryChange={setQuery}
                sort={sort}
                onSortChange={setSort}
                emptyMessage={
                  view === "recent"
                    ? "Nothing is waiting for review right now."
                    : view === "assigned"
                      ? "None of the petitions assigned to you match this filter."
                      : undefined
                }
              />

              <p className="text-xs text-muted-foreground">
                Filter with{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono">
                  state:
                </code>
                ,{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono">
                  category:
                </code>{" "}
                and{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono">
                  author:
                </code>
                . Values with spaces need quotes.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReviewBrowser;
