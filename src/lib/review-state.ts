import { prisma } from "@/lib/prisma";
import { REVIEW_STAGES } from "@/lib/review-stages";
import {
  PetitionAssignmentEntry,
  PetitionReviewEntry,
  PetitionReviewEventEntry,
  ReviewDecision,
  ReviewEventType,
  ReviewerRef,
} from "@/types/petition";

/**
 * Reading the review state of a petition.
 *
 * Lives outside the server-action files because both `actions.ts` and
 * `review-actions.ts` need it, and a "use server" module can only export
 * callable actions — anything shared has to sit somewhere neither owns.
 */

export const REVIEWER_SELECT = {
  id: true,
  name: true,
  displayName: true,
  email: true,
} as const;

export function toReviewerRef(user: {
  id: string;
  name: string | null;
  displayName: string | null;
  email: string;
}): ReviewerRef {
  return {
    id: user.id,
    name: user.displayName || user.name || user.email,
    email: user.email,
  };
}

/** Members of one stage's reviewer pool. */
export async function poolMemberIds(stageKey: string): Promise<Set<string>> {
  const rows = await prisma.reviewStageMember.findMany({
    where: { stageKey },
    select: { userId: true },
  });
  return new Set(rows.map((row) => row.userId));
}

/**
 * Who is on the hook for a stage right now.
 *
 * An assignment stage answers with the people named on this petition; an open
 * stage answers with its whole list, because membership alone is what makes
 * someone eligible there.
 */
export async function stageAudience(
  petitionId: number,
  stageIndex: number,
): Promise<string[]> {
  const stage = REVIEW_STAGES[stageIndex];
  if (!stage) return [];

  if (stage.requiresAssignment) {
    const rows = await prisma.petitionAssignment.findMany({
      where: { petitionId, stage: stageIndex },
      select: { assigneeId: true },
    });
    return rows.map((row) => row.assigneeId);
  }

  return Array.from(await poolMemberIds(stage.key));
}

export interface LoadedReviewState {
  reviews: PetitionReviewEntry[];
  assignments: PetitionAssignmentEntry[];
  events: PetitionReviewEventEntry[];
}

/** Everything `evaluateReview` needs for one petition, in display shape. */
export async function loadReviewState(
  petitionId: number,
): Promise<LoadedReviewState> {
  const [reviews, assignments, events] = await Promise.all([
    prisma.petitionReview.findMany({
      where: { petitionId },
      include: { reviewer: { select: REVIEWER_SELECT } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.petitionAssignment.findMany({
      where: { petitionId },
      include: {
        assignee: { select: REVIEWER_SELECT },
        assignedBy: { select: REVIEWER_SELECT },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.petitionReviewEvent.findMany({
      where: { petitionId },
      include: {
        actor: { select: REVIEWER_SELECT },
        subject: { select: REVIEWER_SELECT },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    reviews: reviews.map(
      (review): PetitionReviewEntry => ({
        id: review.id,
        stage: review.stage,
        decision: review.decision as ReviewDecision,
        comment: review.comment,
        created_at: review.createdAt.toISOString(),
        reviewer: toReviewerRef(review.reviewer),
      }),
    ),
    assignments: assignments.map(
      (entry): PetitionAssignmentEntry => ({
        id: entry.id,
        stage: entry.stage,
        created_at: entry.createdAt.toISOString(),
        assignee: toReviewerRef(entry.assignee),
        assignedBy: entry.assignedBy ? toReviewerRef(entry.assignedBy) : null,
      }),
    ),
    events: events.map(
      (event): PetitionReviewEventEntry => ({
        id: event.id,
        type: event.type as ReviewEventType,
        stage: event.stage,
        created_at: event.createdAt.toISOString(),
        actor: event.actor ? toReviewerRef(event.actor) : null,
        subject: toReviewerRef(event.subject),
      }),
    ),
  };
}
