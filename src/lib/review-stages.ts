import {
  PetitionAssignmentEntry,
  PetitionReviewEntry,
  ReviewDecision,
} from "@/types/petition";

/**
 * The review pipeline, as data.
 *
 * A petition walks this list in order and is published only when every stage
 * is satisfied. Nothing here names a role: a stage says how many approvals it
 * needs and where its reviewers come from, never who they are. That is a
 * superadmin-managed pool keyed by `key` (see ReviewStageMember), so "SG" and
 * "staff" are lists someone maintains, not categories in the schema.
 *
 * The two shapes a stage can take:
 *
 * - `requiresAssignment: false` — the whole pool is eligible on every
 *   petition, and any `minApprovals` of them can pass it. No per-petition
 *   setup.
 * - `requiresAssignment: true` — somebody has to be named on this particular
 *   petition first, and every person named has to approve.
 *
 * Changing the pipeline is editing this array. Adding a third stage, or
 * moving the quorum from three to two, needs no migration: `reviewStage` is
 * just an index into it.
 */
export interface ReviewStage {
  key: string;
  name: string;
  /** Shown under the stage name in the progress list. */
  description: string;
  /**
   * How many distinct approvals the stage needs before it can pass. Assigned
   * reviewers count towards this, and are additionally required individually.
   */
  minApprovals: number;
  /**
   * When true the stage cannot pass until at least one pool member has been
   * assigned to this petition — a quorum alone is not enough.
   */
  requiresAssignment: boolean;
  /** Wording for the "nobody assigned yet" state. */
  assignmentPrompt?: string;
}

export const REVIEW_STAGES: ReviewStage[] = [
  {
    key: "sg",
    name: "Student Government",
    description:
      "Three members of the Student Government reviewer list have to approve. The list is the same for every petition.",
    minApprovals: 3,
    requiresAssignment: false,
  },
  {
    key: "staff",
    name: "Staff sign-off",
    description:
      "One staff member from the staff list is assigned to the petition and gives the final approval.",
    minApprovals: 1,
    requiresAssignment: true,
    assignmentPrompt: "Assign a staff member before this stage can pass.",
  },
];

export const FINAL_STAGE_INDEX = REVIEW_STAGES.length - 1;

export function getStage(index: number): ReviewStage | null {
  return REVIEW_STAGES[index] ?? null;
}

export type StageStatus = "complete" | "current" | "upcoming";

export interface StageProgress {
  index: number;
  stage: ReviewStage;
  status: StageStatus;
  approvals: PetitionReviewEntry[];
  changesRequested: PetitionReviewEntry[];
  assignments: PetitionAssignmentEntry[];
  /** Assignees who have not approved yet — the stage cannot pass without them. */
  awaitingAssignees: PetitionAssignmentEntry[];
  approvalCount: number;
  /** Approvals still needed to reach the quorum. */
  approvalsRemaining: number;
  satisfied: boolean;
  /** True when someone has requested changes and not withdrawn it. */
  blocked: boolean;
  /** The stage requires an assignee and does not have one yet. */
  needsAssignment: boolean;
}

export interface ReviewProgress {
  stages: StageProgress[];
  /** The stage currently being reviewed, or null once review is complete. */
  currentIndex: number | null;
  current: StageProgress | null;
  complete: boolean;
  /** Someone, somewhere in the pipeline, has requested changes. */
  blocked: boolean;
}

/**
 * Evaluates one stage against the reviews and assignments recorded for it.
 *
 * A stage is satisfied when three things hold at once: it has reached its
 * approval quorum, every assignee has approved, and nobody is currently
 * requesting changes. Keeping all three in one place is what stops the rule
 * from drifting between the UI that displays it and the action that enforces
 * it — both call this.
 */
function evaluateStage(
  index: number,
  stage: ReviewStage,
  reviews: PetitionReviewEntry[],
  assignments: PetitionAssignmentEntry[],
): Omit<StageProgress, "status"> {
  const stageReviews = reviews.filter((review) => review.stage === index);
  const stageAssignments = assignments.filter((entry) => entry.stage === index);

  const approvals = stageReviews.filter(
    (review) => review.decision === "APPROVE",
  );
  const changesRequested = stageReviews.filter(
    (review) => review.decision === "CHANGES_REQUESTED",
  );

  const approverIds = new Set(approvals.map((review) => review.reviewer.id));
  const awaitingAssignees = stageAssignments.filter(
    (entry) => !approverIds.has(entry.assignee.id),
  );

  const approvalCount = approverIds.size;
  const blocked = changesRequested.length > 0;
  const needsAssignment =
    stage.requiresAssignment && stageAssignments.length === 0;

  return {
    index,
    stage,
    approvals,
    changesRequested,
    assignments: stageAssignments,
    awaitingAssignees,
    approvalCount,
    approvalsRemaining: Math.max(stage.minApprovals - approvalCount, 0),
    satisfied:
      approvalCount >= stage.minApprovals &&
      awaitingAssignees.length === 0 &&
      !needsAssignment &&
      !blocked,
    blocked,
    needsAssignment,
  };
}

/**
 * The whole pipeline for one petition.
 *
 * `storedStage` is the petition's persisted pointer, but it is treated as a
 * floor rather than the truth: stages are re-evaluated from the reviews
 * themselves so that withdrawing an approval, or a late "request changes",
 * pulls the petition back rather than leaving it stuck forward.
 */
export function evaluateReview(
  storedStage: number,
  reviews: PetitionReviewEntry[] = [],
  assignments: PetitionAssignmentEntry[] = [],
): ReviewProgress {
  const evaluated = REVIEW_STAGES.map((stage, index) =>
    evaluateStage(index, stage, reviews, assignments),
  );

  // The first unsatisfied stage is the live one, whatever the stored pointer
  // says. Everything before it is complete by definition.
  const firstUnsatisfied = evaluated.findIndex((entry) => !entry.satisfied);
  const currentIndex = firstUnsatisfied === -1 ? null : firstUnsatisfied;

  const stages: StageProgress[] = evaluated.map((entry) => ({
    ...entry,
    status:
      currentIndex === null || entry.index < currentIndex
        ? "complete"
        : entry.index === currentIndex
          ? "current"
          : "upcoming",
  }));

  return {
    stages,
    currentIndex,
    current: currentIndex === null ? null : stages[currentIndex],
    complete: currentIndex === null,
    blocked: stages.some((entry) => entry.blocked),
  };
}

/** Human summary of what a stage is still waiting on. */
export function describeStageGap(progress: StageProgress): string {
  if (progress.blocked) {
    const names = progress.changesRequested
      .map((review) => review.reviewer.name)
      .join(", ");
    return `Changes requested by ${names}`;
  }

  if (progress.needsAssignment) {
    return (
      progress.stage.assignmentPrompt ?? "Nobody has been assigned to this yet"
    );
  }

  const parts: string[] = [];
  if (progress.approvalsRemaining > 0) {
    parts.push(
      `${progress.approvalsRemaining} more ${
        progress.approvalsRemaining === 1 ? "approval" : "approvals"
      }`,
    );
  }
  if (progress.awaitingAssignees.length > 0) {
    parts.push(
      `${progress.awaitingAssignees
        .map((entry) => entry.assignee.name)
        .join(", ")}`,
    );
  }

  if (parts.length === 0) return "Satisfied";
  return `Waiting on ${parts.join(" and ")}`;
}

export const REVIEW_DECISIONS: ReviewDecision[] = [
  "APPROVE",
  "CHANGES_REQUESTED",
];

export function isReviewDecision(value: string): value is ReviewDecision {
  return (REVIEW_DECISIONS as string[]).includes(value);
}
