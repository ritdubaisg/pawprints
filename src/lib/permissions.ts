// We doing it like Linux
export const PERMISSIONS = {
  ADD_UPDATE: 1, // 2^0
  RESPONSE: 2, // 2^1
  MARK_IN_PROGRESS: 4, // 2^2
  UNPUBLISH: 8, // 2^3
  EDIT_UPDATE: 16, // 2^4
  EDIT_RESPONSE: 32, // 2^5
  APPROVE: 64, // 2^6
  REJECT: 128, // 2^7
  RETURN: 256, // 2^8
  MANAGE_TIERS: 512, // 2^9
  MANAGE_REVIEWERS: 1024, // 2^10
} as const;

export type PermissionAction =
  | "add_update"
  | "response"
  | "mark-in-progress"
  | "unpublish"
  | "editUpdate"
  | "editResponse"
  | "approve"
  | "reject"
  | "return"
  | "manage_tiers"
  | "manage_reviewers";

export function hasPermission(
  userPermissions: number,
  requiredPermission: number,
): boolean {
  return (userPermissions & requiredPermission) === requiredPermission;
}

export function addPermission(
  userPermissions: number,
  permissionToAdd: number,
): number {
  return userPermissions | permissionToAdd;
}

export function removePermission(
  userPermissions: number,
  permissionToRemove: number,
): number {
  return userPermissions & ~permissionToRemove;
}

export function getRequiredPermissionForAction(
  action: PermissionAction,
): number {
  switch (action) {
    case "add_update":
      return PERMISSIONS.ADD_UPDATE;
    case "response":
      return PERMISSIONS.RESPONSE;
    case "mark-in-progress":
      return PERMISSIONS.MARK_IN_PROGRESS;
    case "unpublish":
      return PERMISSIONS.UNPUBLISH;
    case "editUpdate":
      return PERMISSIONS.EDIT_UPDATE;
    case "editResponse":
      return PERMISSIONS.EDIT_RESPONSE;
    case "approve":
      return PERMISSIONS.APPROVE;
    case "reject":
      return PERMISSIONS.REJECT;
    case "return":
      return PERMISSIONS.RETURN;
    case "manage_tiers":
      return PERMISSIONS.MANAGE_TIERS;
    case "manage_reviewers":
      return PERMISSIONS.MANAGE_REVIEWERS;
    default:
      return 0;
  }
}
