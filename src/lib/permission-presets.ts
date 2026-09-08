import { PERMISSIONS } from "./permissions";

/**
 * Named bundles for the common cases. Ticking nine boxes by hand is slow and
 * easy to get wrong; these cover the roles SG actually appoints.
 *
 * Shared by the user editor and the account issuer so a "Reviewer" means the
 * same thing whichever screen created them.
 */
export const PERMISSION_PRESETS = [
  { label: "None", value: 0 },
  {
    label: "Reviewer (approve / reject / return)",
    value: PERMISSIONS.APPROVE | PERMISSIONS.REJECT | PERMISSIONS.RETURN,
  },
  {
    label: "Review lead (reviewer + assign reviewers)",
    value:
      PERMISSIONS.APPROVE |
      PERMISSIONS.REJECT |
      PERMISSIONS.RETURN |
      PERMISSIONS.MANAGE_REVIEWERS,
  },
  {
    label: "Responder (updates + responses)",
    value:
      PERMISSIONS.ADD_UPDATE |
      PERMISSIONS.RESPONSE |
      PERMISSIONS.EDIT_UPDATE |
      PERMISSIONS.EDIT_RESPONSE |
      PERMISSIONS.MARK_IN_PROGRESS,
  },
  {
    label: "Full staff (everything except superadmin)",
    value: Object.values(PERMISSIONS).reduce((a, b) => a | b, 0),
  },
] as const;

/** Human-readable labels for each bit. */
export const PERMISSION_LABELS: Record<keyof typeof PERMISSIONS, string> = {
  ADD_UPDATE: "Post updates on petitions",
  RESPONSE: "Post official responses",
  MARK_IN_PROGRESS: "Mark petitions in progress",
  UNPUBLISH: "Unpublish / remove petitions",
  EDIT_UPDATE: "Edit existing updates",
  EDIT_RESPONSE: "Edit existing responses",
  APPROVE: "Approve petitions for publication",
  REJECT: "Reject petitions",
  RETURN: "Return petitions for changes",
  MANAGE_TIERS: "Manage petition tiers",
  MANAGE_REVIEWERS: "Assign reviewers to petitions",
};

/** The names of every bit set in `permInt`, for display. */
export function getPermissionNames(permInt: number): string[] {
  if (!permInt) return [];
  const names: string[] = [];
  for (const [key, value] of Object.entries(PERMISSIONS)) {
    if (typeof value === "number" && (permInt & value) === value) {
      names.push(key);
    }
  }
  return names;
}
