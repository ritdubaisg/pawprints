"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * Layout primitives for the admin tables.
 *
 * The dashboard is a spreadsheet, not a document: the page itself never
 * scrolls, the table fills whatever height is left, and the column headers
 * and toolbar stay put while the rows move under them.
 *
 * That only works if the table's own container is the scrollport. `position:
 * sticky` resolves against the nearest scrolling ancestor, so a header inside
 * an unbounded container would scroll away with the page — the scroll has to
 * be owned by an element with a real height, which is what the flex chain
 * below (`min-h-0 flex-1` at every level) provides.
 */

/** The site header is `h-16`; the dashboard claims everything under it. */
export function AdminTableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[calc(100dvh-4rem)] w-full flex-col overflow-hidden">
      {children}
    </div>
  );
}

/** Search and filters. Stacks on narrow screens, one row from `sm` up. */
export function AdminToolbar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2 border-b px-3 py-2 sm:flex-row sm:items-center sm:px-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Row count, pinned below the rows so it is readable without scrolling. */
export function AdminTableFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="shrink-0 border-t bg-muted/30 px-3 py-1.5 text-right text-xs text-muted-foreground sm:px-4">
      {children}
    </div>
  );
}

/**
 * Sticky column headers.
 *
 * The border is drawn with an inset shadow rather than `border-b`: borders on
 * a sticky `<thead>` are painted with the cells and visibly detach while
 * scrolling in WebKit.
 */
export const STICKY_HEADER =
  "sticky top-0 z-20 bg-background [&_tr]:border-0 [&_th]:shadow-[inset_0_-1px_0_var(--border)]";
