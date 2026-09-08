"use server";

/**
 * Staged review: assignment, approvals, and the automatic publish that
 * follows once every stage is satisfied.
 *
 * The rule about when a petition may go live lives in one place —
 * `evaluateReview` in lib/review-stages.ts — and both this file and the UI
 * call it. Nothing here decides for itself whether enough people have signed
 * off.
 */

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getTokens } from "next-firebase-auth-edge";
import { authConfig } from "./config/server-config";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { createNotification, createNotifications } from "@/lib/notifications";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { PETITION_TIERS } from "@/lib/constants";
import {
  PetitionStatus,
  ReviewDecision,
  ReviewerRef,
} from "@/types/petition";
import {
  REVIEWER_SELECT,
  loadReviewState,
  poolMemberIds,
  stageAudience,
  toReviewerRef,
} from "@/lib/review-state";
import {
  REVIEW_STAGES,
  evaluateReview,
  getStage,
  isReviewDecision,
} from "@/lib/review-stages";

interface Actor {
  id: string;
  name: string;
  permissions: number;
  isStaff: boolean;
  isSuperAdmin: boolean;
}

async function requireActor(): Promise<Actor> {
  const tokens = await getTokens(await cookies(), authConfig);
  if (!tokens?.decodedToken.uid) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: tokens.decodedToken.uid },
    select: {
      id: true,
      name: true,
      displayName: true,
      email: true,
      permissions: true,
      isStaff: true,
      isSuperAdmin: true,
    },
  });
  if (!user) throw new Error("Unauthorized");

  return {
    id: user.id,
    name: user.displayName || user.name || user.email,
    permissions: user.permissions,
    isStaff: user.isStaff,
    isSuperAdmin: user.isSuperAdmin,
  };
}

function actorCan(actor: Actor, bit: number) {
  if (actor.isSuperAdmin) return true;
  return actor.isStaff && hasPermission(actor.permissions, bit);
}

/**
 * Petitions the signed-in reviewer is on the hook for.
 *
 * Two ways to be on the hook, and only counting the first was wrong: a
 * Student Government reviewer is never "assigned" to anything, because that
 * stage draws on a fixed list, so their queue came back empty. This covers
 * both — named on the petition, or on the list for the stage it is currently
 * sitting at.
 */
export async function getMyReviewQueueIds(): Promise<number[]> {
  const actor = await requireActor();

  const [assignedRows, myStages] = await Promise.all([
    prisma.petitionAssignment.findMany({
      where: { assigneeId: actor.id },
      select: { petitionId: true },
      distinct: ["petitionId"],
    }),
    prisma.reviewStageMember.findMany({
      where: { userId: actor.id },
      select: { stageKey: true },
    }),
  ]);

  const ids = new Set(assignedRows.map((row) => row.petitionId));

  const myStageKeys = new Set(myStages.map((row) => row.stageKey));
  // Stages that need no assignment: membership alone puts every petition
  // sitting at that stage into this reviewer's queue.
  const openStageIndexes = REVIEW_STAGES.map((stage, index) => ({ stage, index }))
    .filter(
      ({ stage }) => !stage.requiresAssignment && myStageKeys.has(stage.key),
    )
    .map(({ index }) => index);

  if (openStageIndexes.length > 0) {
    // One query, then evaluated in memory: the stored `reviewStage` pointer
    // can lag, and the whole point of this list is that it is accurate.
    const pending = await prisma.petition.findMany({
      where: { status: PetitionStatus.NeedsReview },
      select: {
        id: true,
        reviewStage: true,
        reviews: {
          select: { stage: true, decision: true, reviewerId: true },
        },
        assignments: { select: { stage: true, assigneeId: true } },
      },
    });

    for (const petition of pending) {
      const progress = evaluateReview(
        petition.reviewStage,
        petition.reviews.map((review) => ({
          id: 0,
          stage: review.stage,
          decision: review.decision as ReviewDecision,
          comment: null,
          created_at: "",
          reviewer: { id: review.reviewerId, name: "" },
        })),
        petition.assignments.map((entry) => ({
          id: 0,
          stage: entry.stage,
          created_at: "",
          assignee: { id: entry.assigneeId, name: "" },
          assignedBy: null,
        })),
      );

      if (
        progress.currentIndex !== null &&
        openStageIndexes.includes(progress.currentIndex)
      ) {
        ids.add(petition.id);
      }
    }
  }

  return Array.from(ids);
}

export interface ReviewCandidate extends ReviewerRef {
  isSuperAdmin: boolean;
}

async function requireSuperAdminActor(): Promise<Actor> {
  const actor = await requireActor();
  if (!actor.isSuperAdmin) {
    throw new Error("Unauthorized: Superadmin access required");
  }
  return actor;
}

/**
 * The stage keys the signed-in user is on the reviewer list for. Drives which
 * buttons the review page offers; the server re-checks on submit regardless.
 */
export async function getMyReviewStageKeys(): Promise<string[]> {
  const actor = await requireActor();

  const rows = await prisma.reviewStageMember.findMany({
    where: { userId: actor.id },
    select: { stageKey: true },
  });

  return rows.map((row) => row.stageKey);
}

export interface ReviewPool {
  stageKey: string;
  stageName: string;
  requiresAssignment: boolean;
  minApprovals: number;
  members: ReviewCandidate[];
}

/**
 * The reviewer lists, one per stage, as maintained in the admin panel.
 *
 * Readable by any reviewer — the petition page needs the staff list to offer
 * assignment, and the progress panel needs to explain who a stage is waiting
 * on. Only superadmins can change them.
 */
export async function getReviewPools(): Promise<ReviewPool[]> {
  await requireActor();

  const rows = await prisma.reviewStageMember.findMany({
    include: { user: { select: { ...REVIEWER_SELECT, isSuperAdmin: true } } },
    orderBy: { createdAt: "asc" },
  });

  return REVIEW_STAGES.map((stage) => ({
    stageKey: stage.key,
    stageName: stage.name,
    requiresAssignment: stage.requiresAssignment,
    minApprovals: stage.minApprovals,
    members: rows
      .filter((row) => row.stageKey === stage.key)
      .map((row) => ({
        ...toReviewerRef(row.user),
        isSuperAdmin: row.user.isSuperAdmin,
      })),
  }));
}

/**
 * Everyone who could be put on a reviewer list.
 *
 * Restricted to staff and superadmins because `/review` is gated on staff
 * access — adding anyone else would create a reviewer who cannot open the
 * page they are meant to review on.
 */
export async function getPoolCandidates(): Promise<ReviewCandidate[]> {
  await requireActor();

  const users = await prisma.user.findMany({
    where: {
      disabled: false,
      OR: [{ isSuperAdmin: true }, { isStaff: true }],
    },
    select: { ...REVIEWER_SELECT, isSuperAdmin: true },
    orderBy: [{ displayName: "asc" }, { name: "asc" }],
  });

  return users.map((user) => ({
    ...toReviewerRef(user),
    isSuperAdmin: user.isSuperAdmin,
  }));
}

/**
 * Replaces one stage's reviewer list wholesale. Superadmin only.
 *
 * Removing someone deliberately leaves their past approvals in place: they
 * happened, and deleting them would silently reopen petitions that have
 * already cleared the stage.
 */
export async function setStagePool(stageKey: string, userIds: string[]) {
  const actor = await requireSuperAdminActor();

  const stage = REVIEW_STAGES.find((entry) => entry.key === stageKey);
  if (!stage) throw new Error("Unknown review stage");

  const wanted = Array.from(new Set(userIds ?? []));

  const eligible = await prisma.user.findMany({
    where: { id: { in: wanted } },
    select: { id: true, email: true, isStaff: true, isSuperAdmin: true, disabled: true },
  });

  if (eligible.length !== wanted.length) {
    throw new Error("One of those users no longer exists");
  }
  for (const user of eligible) {
    if (user.disabled) throw new Error(`${user.email} is disabled`);
    if (!user.isStaff && !user.isSuperAdmin) {
      throw new Error(
        `${user.email} needs staff access before they can be a reviewer`,
      );
    }
  }

  const existing = await prisma.reviewStageMember.findMany({
    where: { stageKey },
    select: { userId: true },
  });
  const existingIds = new Set(existing.map((row) => row.userId));

  const added = wanted.filter((id) => !existingIds.has(id));
  const removed = existing
    .map((row) => row.userId)
    .filter((id) => !wanted.includes(id));

  if (added.length === 0 && removed.length === 0) {
    return { added: [], removed: [] };
  }

  await prisma.$transaction([
    ...(removed.length
      ? [
          prisma.reviewStageMember.deleteMany({
            where: { stageKey, userId: { in: removed } },
          }),
        ]
      : []),
    ...(added.length
      ? [
          prisma.reviewStageMember.createMany({
            data: added.map((userId) => ({
              stageKey,
              userId,
              addedById: actor.id,
            })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);

  await logAction(
    "SET_REVIEW_POOL",
    {
      stage: stage.name,
      added: added.length ? added.join(", ") : "none",
      removed: removed.length ? removed.join(", ") : "none",
    },
    actor.id,
  );

  revalidatePath("/admin");
  revalidatePath("/review");

  return { added, removed };
}

/**
 * Who can be assigned to a stage on a petition: that stage's pool, minus
 * anyone already unable to act. Assignment cannot reach outside the list.
 */
export async function getReviewCandidates(
  stageKey: string,
): Promise<ReviewCandidate[]> {
  const actor = await requireActor();
  if (!actorCan(actor, PERMISSIONS.MANAGE_REVIEWERS)) {
    throw new Error("Unauthorized: you cannot manage reviewers");
  }

  const rows = await prisma.reviewStageMember.findMany({
    where: { stageKey, user: { disabled: false } },
    include: { user: { select: { ...REVIEWER_SELECT, isSuperAdmin: true } } },
    orderBy: { createdAt: "asc" },
  });

  return rows.map((row) => ({
    ...toReviewerRef(row.user),
    isSuperAdmin: row.user.isSuperAdmin,
  }));
}

export interface AssignmentChange {
  added: string[];
  removed: string[];
}

/**
 * Replaces the whole assignee list for one stage in a single round trip.
 *
 * Assigning people one at a time meant a request and a full refresh each,
 * which is slow enough to be visible when staffing a petition. The UI now
 * collects the selection and sends the finished list; this works out the diff
 * so the caller never has to.
 */
export async function setStageAssignees(
  petitionId: number,
  stage: number,
  assigneeIds: string[],
): Promise<AssignmentChange> {
  const actor = await requireActor();
  if (!actorCan(actor, PERMISSIONS.MANAGE_REVIEWERS)) {
    throw new Error("Unauthorized: you cannot manage reviewers");
  }

  const stageDefinition = getStage(stage);
  if (!stageDefinition) throw new Error("Unknown review stage");

  const petition = await prisma.petition.findUnique({
    where: { id: petitionId },
    select: { id: true, title: true },
  });
  if (!petition) throw new Error("Petition not found");

  const wanted = Array.from(new Set(assigneeIds ?? []));

  const existing = await prisma.petitionAssignment.findMany({
    where: { petitionId, stage },
    select: { id: true, assigneeId: true },
  });
  const existingIds = new Set(existing.map((entry) => entry.assigneeId));

  const added = wanted.filter((id) => !existingIds.has(id));
  const removed = existing
    .filter((entry) => !wanted.includes(entry.assigneeId))
    .map((entry) => entry.assigneeId);

  if (added.length === 0 && removed.length === 0) {
    return { added: [], removed: [] };
  }

  // Everyone being added is validated up front, so a bad id fails the whole
  // batch rather than leaving the stage half-assigned.
  const newcomers = added.length
    ? await prisma.user.findMany({
        where: { id: { in: added } },
        select: { ...REVIEWER_SELECT, disabled: true },
      })
    : [];

  if (newcomers.length !== added.length) {
    throw new Error("One of those users no longer exists");
  }

  const pool = await poolMemberIds(stageDefinition.key);

  for (const user of newcomers) {
    if (user.disabled) {
      throw new Error(`${user.name ?? user.email} is disabled`);
    }
    // Assignment cannot reach outside the list a superadmin curates. Someone
    // off the list could never approve, so assigning them would leave the
    // stage permanently unsatisfiable.
    if (!pool.has(user.id)) {
      throw new Error(
        `${user.name ?? user.email} is not on the ${stageDefinition.name} list`,
      );
    }
  }

  await prisma.$transaction([
    ...(removed.length
      ? [
          prisma.petitionAssignment.deleteMany({
            where: { petitionId, stage, assigneeId: { in: removed } },
          }),
        ]
      : []),
    ...(added.length
      ? [
          prisma.petitionAssignment.createMany({
            data: added.map((assigneeId) => ({
              petitionId,
              stage,
              assigneeId,
              assignedById: actor.id,
            })),
            skipDuplicates: true,
          }),
        ]
      : []),
    // Written in the same transaction as the state change, so the timeline
    // can never disagree with who is actually assigned.
    prisma.petitionReviewEvent.createMany({
      data: [
        ...added.map((subjectId) => ({
          petitionId,
          stage,
          type: "ASSIGNED",
          actorId: actor.id,
          subjectId,
        })),
        ...removed.map((subjectId) => ({
          petitionId,
          stage,
          type: "UNASSIGNED",
          actorId: actor.id,
          subjectId,
        })),
      ],
    }),
  ]);

  await logAction(
    "SET_STAGE_ASSIGNEES",
    {
      petitionId,
      stage: stageDefinition.name,
      added: newcomers.map((user) => user.email).join(", ") || "none",
      removed: removed.length ? removed.join(", ") : "none",
    },
    actor.id,
  );

  await createNotifications(
    newcomers.filter((user) => user.id !== actor.id).map((user) => user.id),
    "Assigned to review a petition",
    `${actor.name} assigned you to review "${petition.title}".`,
    "REVIEW",
    petitionId,
  );

  await createNotifications(
    removed.filter((id) => id !== actor.id),
    "Removed from a review",
    `${actor.name} removed you from reviewing "${petition.title}". No action is needed from you.`,
    "REVIEW",
    petitionId,
  );

  // Dropping a blocker can be the thing that completes a stage.
  if (removed.length > 0) {
    await settleReview(petitionId, actor);
  }

  revalidatePath(`/review/${petitionId}`);
  revalidatePath("/review");

  return { added, removed };
}

/**
 * Records one reviewer's decision on whatever stage the petition is currently
 * on, then re-checks whether that finished the pipeline.
 *
 * The stage is taken from the server's own evaluation rather than from the
 * client, so a stale page cannot submit an approval against a stage that has
 * already moved on.
 */
export async function submitReview(
  petitionId: number,
  decision: string,
  comment?: string,
) {
  const actor = await requireActor();

  if (!isReviewDecision(decision)) {
    throw new Error("Unknown review decision");
  }

  const petition = await prisma.petition.findUnique({
    where: { id: petitionId },
    select: { id: true, title: true, status: true, reviewStage: true, authorId: true },
  });
  if (!petition) throw new Error("Petition not found");

  if (petition.status !== PetitionStatus.NeedsReview) {
    throw new Error("This petition is not open for review");
  }
  if (petition.authorId === actor.id && !actor.isSuperAdmin) {
    throw new Error("You cannot review your own petition");
  }

  const state = await loadReviewState(petitionId);
  const progress = evaluateReview(
    petition.reviewStage,
    state.reviews,
    state.assignments,
  );

  if (progress.complete) {
    throw new Error("Review is already complete for this petition");
  }

  const stageIndex = progress.currentIndex!;
  const stageProgress = progress.stages[stageIndex];

  // Membership in the stage's list is what makes someone a reviewer — not a
  // permission bit. For a stage that requires assignment, being on the list is
  // necessary but not sufficient: this petition has to have named you.
  const stageKey = REVIEW_STAGES[stageIndex].key;
  const pool = await poolMemberIds(stageKey);
  const isAssigned = stageProgress.assignments.some(
    (entry) => entry.assignee.id === actor.id,
  );

  if (!actor.isSuperAdmin) {
    if (!pool.has(actor.id)) {
      throw new Error(
        `You are not on the ${REVIEW_STAGES[stageIndex].name} reviewer list`,
      );
    }
    if (REVIEW_STAGES[stageIndex].requiresAssignment && !isAssigned) {
      throw new Error("You have not been assigned to this petition");
    }
  }

  await prisma.petitionReview.upsert({
    where: {
      petitionId_stage_reviewerId: {
        petitionId,
        stage: stageIndex,
        reviewerId: actor.id,
      },
    },
    update: { decision, comment: comment?.trim() || null, createdAt: new Date() },
    create: {
      petitionId,
      stage: stageIndex,
      reviewerId: actor.id,
      decision,
      comment: comment?.trim() || null,
    },
  });

  await logAction(
    decision === "APPROVE" ? "REVIEW_APPROVE" : "REVIEW_REQUEST_CHANGES",
    {
      petitionId,
      stage: REVIEW_STAGES[stageIndex]?.name ?? stageIndex,
    },
    actor.id,
  );

  if (decision === "CHANGES_REQUESTED") {
    await createNotification(
      petition.authorId,
      "Changes requested",
      `A reviewer requested changes on "${petition.title}".`,
      "REVIEW",
      petitionId,
    );
  }

  if (decision === "APPROVE") {
    await notifyIfOneApprovalLeft(petitionId, petition.title, stageIndex, actor);
  }

  await settleReview(petitionId, actor);

  revalidatePath(`/review/${petitionId}`);
  revalidatePath("/review");
}

/** Withdraws the caller's own decision, putting the stage back where it was. */
export async function withdrawReview(petitionId: number, stage: number) {
  const actor = await requireActor();

  const existing = await prisma.petitionReview.findUnique({
    where: {
      petitionId_stage_reviewerId: {
        petitionId,
        stage,
        reviewerId: actor.id,
      },
    },
  });
  if (!existing) return;

  await prisma.petitionReview.delete({ where: { id: existing.id } });

  await logAction(
    "REVIEW_WITHDRAW",
    { petitionId, stage: REVIEW_STAGES[stage]?.name ?? stage },
    actor.id,
  );

  await settleReview(petitionId, actor);

  revalidatePath(`/review/${petitionId}`);
}

/**
 * Nudges the people a stage is now waiting on, once it is one approval from
 * done.
 *
 * Deliberately narrow: it fires only at the point where a single person can
 * finish the stage, so nobody is pinged on every intermediate approval. When
 * that person is uniquely identifiable they are told as much, because "you
 * are the last one" is far more actionable than "one more is needed".
 */
async function notifyIfOneApprovalLeft(
  petitionId: number,
  title: string,
  stageIndex: number,
  actor: Actor,
) {
  const state = await loadReviewState(petitionId);
  const petition = await prisma.petition.findUnique({
    where: { id: petitionId },
    select: { reviewStage: true },
  });
  const progress = evaluateReview(
    petition?.reviewStage ?? 0,
    state.reviews,
    state.assignments,
  );

  const current = progress.current;
  // Only for the stage that was just approved, and only while it is still
  // short — if that approval completed it, the hand-off notice covers it.
  if (!current || current.index !== stageIndex || current.blocked) return;
  if (current.approvalsRemaining !== 1) return;

  const approvedIds = new Set(
    current.approvals.map((review) => review.reviewer.id),
  );

  // Anyone still required by name outranks the open pool: if one assignee is
  // outstanding, the stage is waiting on exactly them.
  const outstanding =
    current.awaitingAssignees.length > 0
      ? current.awaitingAssignees.map((entry) => entry.assignee.id)
      : (await stageAudience(petitionId, stageIndex)).filter(
          (id) => !approvedIds.has(id),
        );

  const recipients = outstanding.filter((id) => id !== actor.id);
  if (recipients.length === 0) return;

  if (recipients.length === 1) {
    await createNotification(
      recipients[0],
      "You are the last approval needed",
      `"${title}" clears ${current.stage.name} as soon as you approve it.`,
      "REVIEW",
      petitionId,
    );
    return;
  }

  await createNotifications(
    recipients,
    "One approval left",
    `"${title}" needs one more approval to clear ${current.stage.name}.`,
    "REVIEW",
    petitionId,
  );
}

/**
 * Re-evaluates the pipeline and applies whatever it implies: advance the
 * stored stage pointer, and publish once every stage is satisfied.
 *
 * Called after anything that could change the outcome — a review, a
 * withdrawal, an unassignment — so publication is never a separate button
 * someone has to remember to press.
 */
async function settleReview(petitionId: number, actor: Actor) {
  const petition = await prisma.petition.findUnique({
    where: { id: petitionId },
    select: {
      id: true,
      title: true,
      status: true,
      reviewStage: true,
      authorId: true,
    },
  });
  if (!petition || petition.status !== PetitionStatus.NeedsReview) return;

  const state = await loadReviewState(petitionId);
  const progress = evaluateReview(
    petition.reviewStage,
    state.reviews,
    state.assignments,
  );

  const nextStage = progress.currentIndex ?? REVIEW_STAGES.length;

  if (!progress.complete) {
    if (nextStage !== petition.reviewStage) {
      await prisma.petition.update({
        where: { id: petitionId },
        data: { reviewStage: nextStage },
      });

      // Only on the way forward. Falling back to an earlier stage — a
      // withdrawn approval, a late changes request — is not news the next
      // stage needs.
      if (nextStage > petition.reviewStage) {
        const stage = REVIEW_STAGES[nextStage];
        const audience = await stageAudience(petitionId, nextStage);
        await createNotifications(
          audience.filter((id) => id !== actor.id),
          `Petition ready for ${stage.name}`,
          `"${petition.title}" cleared ${
            REVIEW_STAGES[nextStage - 1]?.name ?? "the previous stage"
          } and is now waiting on ${stage.name}.`,
          "REVIEW",
          petitionId,
        );

        if (stage.requiresAssignment && audience.length === 0) {
          // Nobody to tell, and the stage cannot move until that changes.
          await notifyAssignmentNeeded(petitionId, petition.title, stage.name);
        }
      }
    }
    return;
  }

  await prisma.petition.update({
    where: { id: petitionId },
    data: { status: PetitionStatus.Published, reviewStage: REVIEW_STAGES.length },
  });

  await logAction(
    "PUBLISH_AFTER_REVIEW",
    { petitionId, title: petition.title },
    actor.id,
  );

  await createNotification(
    petition.authorId,
    "Petition Approved",
    `Your petition "${petition.title}" cleared review and is now live.`,
    "REVIEW",
    petitionId,
  );

  revalidatePath("/", "layout");
}

/**
 * A stage that requires an assignee has arrived with nobody on it. The people
 * who can unblock it are the ones holding MANAGE_REVIEWERS, so they are who
 * gets told — otherwise the petition sits there silently.
 */
async function notifyAssignmentNeeded(
  petitionId: number,
  title: string,
  stageName: string,
) {
  const managers = await prisma.user.findMany({
    where: {
      disabled: false,
      OR: [
        { isSuperAdmin: true },
        { isStaff: true, permissions: { gt: 0 } },
      ],
    },
    select: { id: true, permissions: true, isSuperAdmin: true },
  });

  await createNotifications(
    managers
      .filter(
        (user) =>
          user.isSuperAdmin ||
          hasPermission(user.permissions, PERMISSIONS.MANAGE_REVIEWERS),
      )
      .map((user) => user.id),
    `${stageName} needs an assignee`,
    `"${title}" is waiting on ${stageName} but nobody has been assigned to it.`,
    "REVIEW",
    petitionId,
  );
}

/**
 * Sets the category and tier while a petition is under review.
 *
 * Split out from approval: under a staged pipeline nobody "approves and
 * publishes" in one step any more, so classification needs its own home.
 */
export async function setPetitionClassification(
  petitionId: number,
  tierId: number,
  categoryName: string,
) {
  const actor = await requireActor();
  if (!actorCan(actor, PERMISSIONS.APPROVE)) {
    throw new Error("Unauthorized: Insufficient permissions");
  }

  const tier = PETITION_TIERS.find((entry) => entry.id === tierId);
  if (!tier) throw new Error("Unknown tier");
  if (!categoryName?.trim()) throw new Error("Category is required");

  await prisma.petition.update({
    where: { id: petitionId },
    data: {
      tier: tier.id,
      targetSignatures: tier.threshold,
      tags: {
        set: [],
        connectOrCreate: [
          {
            where: { name: categoryName },
            create: { name: categoryName },
          },
        ],
      },
    },
  });

  await logAction(
    "SET_PETITION_CLASSIFICATION",
    { petitionId, tierId: tier.id, categoryName },
    actor.id,
  );

  revalidatePath(`/review/${petitionId}`);
}
