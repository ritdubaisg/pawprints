"use client";

import React from "react";
import {
  Check,
  FileText,
  Megaphone,
  MessageSquareQuote,
  UserPlus,
  UserMinus,
  TriangleAlert,
} from "lucide-react";
import { Petition } from "@/types/petition";
import { REVIEW_STAGES } from "@/lib/review-stages";
import { formatDateTime, formatRelative } from "@/lib/dates";
import { cn } from "@/lib/utils";

const PROSE =
  "prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed [&_h1]:!text-foreground [&_h2]:!text-foreground [&_h3]:!text-foreground [&_p]:!text-foreground [&_strong]:!text-foreground [&_li]:!text-foreground";

/**
 * One node on the timeline: a dot on the rail, then whatever the event is.
 * The rail itself is drawn by the parent `<ol>`, so a node knows nothing
 * about its neighbours.
 */
export function TimelineItem({
  icon: Icon,
  iconClassName,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <li className="relative pl-10">
      <span
        className={cn(
          "absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full border bg-background",
          iconClassName,
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      {children}
    </li>
  );
}

/**
 * A bordered card with a muted header strip, for anything with a body.
 *
 * The strip carries both readings of the same instant: "2 days ago" for
 * pacing, and the wall-clock time for the record.
 */
export function TimelineCard({
  byline,
  timestamp,
  accentClassName,
  children,
}: {
  byline: React.ReactNode;
  timestamp: string;
  accentClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg border", accentClassName)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b bg-muted/40 px-4 py-2 text-sm">
        <span className="min-w-0">{byline}</span>
        <time
          dateTime={timestamp}
          className="text-xs whitespace-nowrap text-muted-foreground"
        >
          {formatDateTime(timestamp)}
        </time>
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}

/**
 * A one-line event: no card, just a small marker and a sentence. Reviews and
 * assignments are things that happened, not things to read, so they get the
 * lighter treatment.
 */
export function TimelineEvent({
  icon: Icon,
  iconClassName,
  children,
  timestamp,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  children: React.ReactNode;
  timestamp: string;
}) {
  return (
    <li className="relative flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-10 text-sm">
      <span className="absolute left-1 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-muted">
        <Icon className={cn("h-3 w-3", iconClassName)} />
      </span>
      <span className="min-w-0">{children}</span>
      <time
        dateTime={timestamp}
        className="text-xs whitespace-nowrap text-muted-foreground"
      >
        {formatDateTime(timestamp)}
      </time>
    </li>
  );
}

function stageName(index: number) {
  return REVIEW_STAGES[index]?.name ?? `stage ${index + 1}`;
}

export function PetitionTimeline({
  petition,
  children,
}: {
  petition: Petition;
  /** The action box, rendered as the final node so the page ends in a decision. */
  children?: React.ReactNode;
}) {
  return (
    <ol
      className={cn(
        "relative space-y-4 pb-2",
        // The rail. Sits at the centre of the 28px dots and stops short at
        // both ends so it does not poke out past the first and last node.
        "before:absolute before:left-3.5 before:top-4 before:bottom-4 before:w-px before:bg-border",
      )}
    >
      <TimelineItem icon={FileText}>
        <TimelineCard
          timestamp={petition.created_at}
          byline={
            <>
              <span className="font-semibold">{petition.author}</span>{" "}
              <span className="text-muted-foreground">
                opened this {formatRelative(petition.created_at)}
              </span>
            </>
          }
        >
          {petition.description ? (
            <div
              className={PROSE}
              dangerouslySetInnerHTML={{ __html: petition.description }}
            />
          ) : (
            <p className="text-sm text-muted-foreground italic">
              This petition has no body content.
            </p>
          )}
        </TimelineCard>
      </TimelineItem>

      {renderEvents(petition)}

      {children}
    </ol>
  );
}

interface TimelineEntry {
  key: string;
  at: string;
  node: React.ReactNode;
}

/**
 * Updates, the response, reviews and assignments in one chronological run.
 *
 * They are interleaved rather than grouped by type because the order is the
 * story: an approval that arrived before a "changes requested" reads very
 * differently from one that arrived after.
 */
function renderEvents(petition: Petition) {
  const entries: TimelineEntry[] = [];

  for (const update of petition.updates) {
    entries.push({
      key: `update-${update.id}`,
      at: update.created_at,
      node: (
        <TimelineItem
          key={`update-${update.id}`}
          icon={Megaphone}
          iconClassName="text-muted-foreground"
        >
          <TimelineCard
            timestamp={update.created_at}
            byline={
              <>
                <span className="font-semibold">
                  {update.author || "Student Government"}
                </span>{" "}
                <span className="text-muted-foreground">
                  posted an update {formatRelative(update.created_at)}
                </span>
              </>
            }
          >
            <div
              className={PROSE}
              dangerouslySetInnerHTML={{ __html: update.description }}
            />
          </TimelineCard>
        </TimelineItem>
      ),
    });
  }

  if (petition.response) {
    const response = petition.response;
    entries.push({
      key: `response-${response.id}`,
      at: response.created_at,
      node: (
        <TimelineItem
          key={`response-${response.id}`}
          icon={MessageSquareQuote}
          iconClassName="border-emerald-600/40 text-emerald-600 dark:text-emerald-500"
        >
          <TimelineCard
            accentClassName="border-emerald-600/40"
            timestamp={response.created_at}
            byline={
              <>
                <span className="font-semibold">
                  {response.author || "Student Government"}
                </span>{" "}
                <span className="text-muted-foreground">
                  posted the official response{" "}
                  {formatRelative(response.created_at)}
                </span>
              </>
            }
          >
            <div
              className={PROSE}
              dangerouslySetInnerHTML={{ __html: response.description }}
            />
          </TimelineCard>
        </TimelineItem>
      ),
    });
  }

  // Driven by the event log rather than the live assignment rows, so that
  // removing someone leaves a trace instead of erasing that they were ever on
  // the petition.
  for (const event of petition.review_events ?? []) {
    const assigned = event.type === "ASSIGNED";
    entries.push({
      key: `event-${event.id}`,
      at: event.created_at,
      node: (
        <TimelineEvent
          key={`event-${event.id}`}
          icon={assigned ? UserPlus : UserMinus}
          iconClassName={assigned ? undefined : "text-muted-foreground"}
          timestamp={event.created_at}
        >
          <span className="font-medium">{event.actor?.name ?? "Someone"}</span>{" "}
          <span className="text-muted-foreground">
            {assigned ? "assigned" : "unassigned"}
          </span>{" "}
          <span className="font-medium">{event.subject.name}</span>{" "}
          <span className="text-muted-foreground">
            {assigned ? "to" : "from"} {stageName(event.stage)}
          </span>
        </TimelineEvent>
      ),
    });
  }

  for (const review of petition.reviews ?? []) {
    const approved = review.decision === "APPROVE";
    entries.push({
      key: `review-${review.id}`,
      at: review.created_at,
      node: (
        <React.Fragment key={`review-${review.id}`}>
          <TimelineEvent
            icon={approved ? Check : TriangleAlert}
            iconClassName={
              approved
                ? "text-emerald-600 dark:text-emerald-500"
                : "text-destructive"
            }
            timestamp={review.created_at}
          >
            <span className="font-medium">{review.reviewer.name}</span>{" "}
            <span className="text-muted-foreground">
              {approved ? "approved" : "requested changes on"}{" "}
              {stageName(review.stage)}
            </span>
          </TimelineEvent>
          {review.comment && (
            <li className="relative pl-10">
              <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                {review.comment}
              </p>
            </li>
          )}
        </React.Fragment>
      ),
    });
  }

  entries.sort((a, b) => +new Date(a.at) - +new Date(b.at));

  return entries.map((entry) => entry.node);
}

export default PetitionTimeline;
