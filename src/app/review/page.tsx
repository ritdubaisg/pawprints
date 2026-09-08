import { redirect } from "next/navigation";
import { getAdminPetitions, getStaffPermissions } from "@/app/actions";
import { getMyReviewQueueIds } from "@/app/review-actions";
import { ReviewBrowser } from "@/components/review/ReviewBrowser";

export const metadata = {
  title: "Review",
};

/**
 * The reviewer's home: every petition in one list, filtered by a query
 * string. Gated on the server so a non-staff visitor never receives the data,
 * rather than being bounced by a client-side guard after it has loaded.
 */
export default async function ReviewPage() {
  const perms = await getStaffPermissions();
  if (!perms.isStaff && !perms.isSuperAdmin) {
    redirect("/");
  }

  const [petitions, assignedIds] = await Promise.all([
    getAdminPetitions(),
    getMyReviewQueueIds(),
  ]);

  return <ReviewBrowser petitions={petitions} assignedIds={assignedIds} />;
}
