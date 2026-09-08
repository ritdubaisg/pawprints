"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Inbox } from "lucide-react";
import { Petition, PetitionStatus } from "@/types/petition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTime, formatRelative } from "@/lib/dates";
import { SignatureMeter } from "./SignatureMeter";
import { cn } from "@/lib/utils";
import { PETITION_CATEGORIES, PETITION_THRESHOLD } from "@/lib/constants";
import {
  PETITION_STATE_LIST,
  PetitionStateIcon,
  PetitionStatusChip,
} from "@/lib/petition-status";
import {
  ParsedQuery,
  hasQualifier,
  setQualifier,
  toggleQualifier,
} from "@/lib/petition-search";

export type SortKey = "newest" | "oldest" | "signatures" | "activity";

/** The list grows on demand rather than scrolling inside its own box. */
const PAGE_SIZE = 25;

const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest",
  oldest: "Oldest",
  signatures: "Most signatures",
  activity: "Recently signed",
};

export function sortPetitions(petitions: Petition[], sort: SortKey) {
  const sorted = [...petitions];
  switch (sort) {
    case "oldest":
      return sorted.sort(
        (a, b) => +new Date(a.created_at) - +new Date(b.created_at),
      );
    case "signatures":
      return sorted.sort((a, b) => b.signatures - a.signatures);
    case "activity":
      return sorted.sort(
        (a, b) =>
          +new Date(b.last_signed ?? b.created_at) -
          +new Date(a.last_signed ?? a.created_at),
      );
    default:
      return sorted.sort(
        (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
      );
  }
}

interface PetitionListProps {
  petitions: Petition[];
  /** Unfiltered, for the counts in the state toggles. */
  allPetitions: Petition[];
  query: string;
  parsed: ParsedQuery;
  onQueryChange: (query: string) => void;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  emptyMessage?: React.ReactNode;
}

export function PetitionList({
  petitions,
  allPetitions,
  query,
  parsed,
  onQueryChange,
  sort,
  onSortChange,
  emptyMessage,
}: PetitionListProps) {
  const [visible, setVisible] = useState(PAGE_SIZE);

  // A new filter or sort means a new list; keeping an expanded count would
  // dump every result on screen the moment someone narrows the search.
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [query, sort, petitions.length]);

  const countFor = (status: PetitionStatus) =>
    allPetitions.filter((petition) => petition.status === status).length;

  const activeCategories = parsed.qualifiers.category;

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex flex-col gap-2 border-b bg-muted/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        {/* State toggles, mirroring the Open / Closed pair on a repo's issue
            list — the two counts a reviewer actually triages by. */}
        <div className="-mx-1 flex items-center gap-1 overflow-x-auto px-1">
          {PETITION_STATE_LIST.map(({ status, meta }) => {
            const active = hasQualifier(parsed, "state", meta.key);
            return (
              <button
                key={meta.key}
                type="button"
                onClick={() => onQueryChange(toggleQualifier(query, "state", meta.key))}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm whitespace-nowrap transition-colors",
                  active
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <PetitionStateIcon
                  status={status}
                  className={cn("h-3.5 w-3.5", !active && "opacity-70")}
                />
                {meta.label}
                <span className="rounded-full bg-muted-foreground/15 px-1.5 text-xs tabular-nums">
                  {countFor(status)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                Category
                {activeCategories.length > 0 && (
                  <span className="ml-1 rounded-full bg-muted-foreground/15 px-1.5 text-xs tabular-nums">
                    {activeCategories.length}
                  </span>
                )}
                <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 w-64 overflow-y-auto">
              <DropdownMenuLabel>Filter by category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {PETITION_CATEGORIES.map((category) => (
                <DropdownMenuCheckboxItem
                  key={category}
                  checked={hasQualifier(parsed, "category", category)}
                  onCheckedChange={() =>
                    onQueryChange(toggleQualifier(query, "category", category))
                  }
                >
                  {category}
                </DropdownMenuCheckboxItem>
              ))}
              {activeCategories.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={false}
                    onCheckedChange={() =>
                      onQueryChange(setQualifier(query, "category", null))
                    }
                  >
                    Clear categories
                  </DropdownMenuCheckboxItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                {SORT_LABELS[sort]}
                <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={sort}
                onValueChange={(value) => onSortChange(value as SortKey)}
              >
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                  <DropdownMenuRadioItem key={key} value={key}>
                    {SORT_LABELS[key]}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {petitions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">No petitions found</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {emptyMessage ?? "Try removing a filter or clearing the search."}
          </p>
        </div>
      ) : (
        <>
          <ul className="divide-y">
            {petitions.slice(0, visible).map((petition) => (
              <PetitionRow key={petition.id} petition={petition} />
            ))}
          </ul>
          {petitions.length > visible && (
            <div className="border-t bg-muted/20 p-2 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVisible((count) => count + PAGE_SIZE)}
                className="text-muted-foreground"
              >
                Show {Math.min(PAGE_SIZE, petitions.length - visible)} more
                <span className="ml-1 text-xs">
                  ({petitions.length - visible} remaining)
                </span>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PetitionRow({ petition }: { petition: Petition }) {
  const threshold = petition.targetSignatures || PETITION_THRESHOLD;

  return (
    <li className="transition-colors hover:bg-muted/40">
      <Link
        href={`/review/${petition.id}`}
        className="flex items-start gap-3 px-3 py-3 sm:px-4"
      >
        <PetitionStateIcon status={petition.status} className="mt-0.5 shrink-0" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold break-words hover:text-[#F76902] sm:text-base">
              {petition.title}
            </span>
            <PetitionStatusChip
              status={petition.status}
              className="px-2 py-0 text-[11px] font-normal"
            />
            {petition.tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="h-5 rounded-full px-2 text-[11px] font-normal"
              >
                {tag.name}
              </Badge>
            ))}
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            #{petition.id} · opened{" "}
            <time
              dateTime={petition.created_at}
              title={formatDateTime(petition.created_at)}
            >
              {formatRelative(petition.created_at)}
            </time>{" "}
            by {petition.author}
          </p>
        </div>

        <SignatureMeter
          signatures={petition.signatures}
          target={threshold}
          className="shrink-0"
        />
      </Link>
    </li>
  );
}

export default PetitionList;
