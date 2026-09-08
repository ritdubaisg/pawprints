"use client";

import React from "react";
import { Inbox, UserCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type ReviewView = "all" | "assigned" | "recent";

interface ViewDefinition {
  key: ReviewView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Rendered as a "later" marker; the view still opens and explains itself. */
  comingSoon?: boolean;
}

export const REVIEW_VIEWS: ViewDefinition[] = [
  { key: "all", label: "Petitions", icon: Inbox },
  { key: "assigned", label: "Assigned to me", icon: UserCheck },
  { key: "recent", label: "Recent activity", icon: Clock },
];

interface ReviewSidebarProps {
  view: ReviewView;
  onViewChange: (view: ReviewView) => void;
  counts: Partial<Record<ReviewView, number>>;
}

/**
 * Vertical nav on desktop, a horizontally scrolling chip row on mobile — the
 * same three destinations either way, so the mobile layout does not hide a
 * view behind a menu.
 */
export function ReviewSidebar({
  view,
  onViewChange,
  counts,
}: ReviewSidebarProps) {
  return (
    <nav
      aria-label="Review views"
      className="-mx-4 flex shrink-0 gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:w-56 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
    >
      {REVIEW_VIEWS.map(({ key, label, icon: Icon, comingSoon }) => {
        const active = view === key;
        const count = counts[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onViewChange(key)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors lg:w-full",
              active
                ? "bg-muted font-semibold text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {/* A short pill rather than a full-height rule: it marks the row
                without drawing a line the length of the nav. */}
            {active && (
              <span
                aria-hidden
                className="absolute left-0 top-1/2 hidden h-4 w-1 -translate-y-1/2 rounded-full bg-[#F76902] lg:block"
              />
            )}
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">{label}</span>
            {comingSoon ? (
              <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                Soon
              </Badge>
            ) : count !== undefined ? (
              <span className="rounded-full bg-muted-foreground/15 px-1.5 text-xs tabular-nums">
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

export default ReviewSidebar;
