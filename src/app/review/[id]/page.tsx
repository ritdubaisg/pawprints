import { notFound, redirect } from "next/navigation";
import {
  getCurrentUserId,
  getReviewPetition,
  getStaffPermissions,
} from "@/app/actions";
import { getMyReviewStageKeys } from "@/app/review-actions";
import { PetitionDetail } from "@/components/review/PetitionDetail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Review #${id}` };
}

/**
 * A single petition, read top to bottom as a timeline ending in the decision
 * panel. Permissions are resolved here and passed down so the panel can
 * disable what this reviewer cannot do — the server actions enforce it
 * regardless, this only stops the UI from offering a dead button.
 */
export default async function ReviewPetitionPage({ params }: PageProps) {
  const perms = await getStaffPermissions();
  if (!perms.isStaff && !perms.isSuperAdmin) {
    redirect("/");
  }

  const { id } = await params;
  const [petition, currentUserId, myStageKeys] = await Promise.all([
    getReviewPetition(Number(id)),
    getCurrentUserId(),
    getMyReviewStageKeys(),
  ]);
  if (!petition) {
    notFound();
  }

  return (
    <PetitionDetail
      petition={petition}
      permissions={perms.permissions}
      isSuperAdmin={perms.isSuperAdmin}
      currentUserId={currentUserId}
      myStageKeys={myStageKeys}
    />
  );
}
