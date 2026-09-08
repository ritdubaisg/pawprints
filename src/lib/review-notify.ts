import { createNotifications } from "@/lib/notifications";
import { REVIEW_STAGES } from "@/lib/review-stages";
import { stageAudience } from "@/lib/review-state";

/**
 * Review notifications that fire from outside the review actions.
 *
 * Kept in a plain module rather than a "use server" file on purpose: every
 * export of a server-action module is a public endpoint, and this one takes a
 * petition id and a message, which is exactly the shape someone would abuse
 * to spam notifications.
 */

/**
 * Tells the first stage's reviewer list that something new has arrived.
 *
 * Called when an author submits. Without it a petition lands in the queue and
 * waits for somebody to notice on their own.
 */
export async function notifyReviewSubmitted(petitionId: number, title: string) {
  const audience = await stageAudience(petitionId, 0);

  await createNotifications(
    audience,
    "New petition to review",
    `"${title}" has been submitted and is waiting on ${
      REVIEW_STAGES[0]?.name ?? "review"
    }.`,
    "REVIEW",
    petitionId,
  );
}
