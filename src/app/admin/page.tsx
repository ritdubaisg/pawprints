import { AdminGuard } from "@/components";
import AdminDashboard from "@/components/Admin/AdminDashboard";
import {
  getAuditLogs,
  getUsers,
  getStaffPermissions,
  getCurrentUserId,
} from "@/app/actions";
import { getPoolCandidates, getReviewPools } from "@/app/review-actions";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const perms = await getStaffPermissions();
  if (!perms.isSuperAdmin) {
    redirect("/");
  }

  let logs: any[] = [];
  let users: any[] = [];

  try {
    const data = await Promise.all([
      getAuditLogs().catch((e) => {
        console.error("Failed to fetch logs:", e);
        return [];
      }),
      getUsers().catch((e) => {
        console.error("Failed to fetch users:", e);
        return [];
      }),
    ]);
    logs = data[0];
    users = data[1];
  } catch (error) {
    console.error("Error loading admin data:", error);
  }

  // Needed by the editor dialog to disable self-affecting controls: a
  // superadmin cannot demote themselves, nor remove the last superadmin.
  const currentUserId = await getCurrentUserId();
  const superAdminCount = users.filter((u: any) => u.isSuperAdmin).length;

  const [pools, poolCandidates] = await Promise.all([
    getReviewPools().catch((e) => {
      console.error("Failed to fetch review pools:", e);
      return [];
    }),
    getPoolCandidates().catch((e) => {
      console.error("Failed to fetch pool candidates:", e);
      return [];
    }),
  ]);

  return (
    <AdminGuard>
      <AdminDashboard
        logs={logs}
        users={users}
        currentUserId={currentUserId}
        superAdminCount={superAdminCount}
        pools={pools}
        poolCandidates={poolCandidates}
      />
    </AdminGuard>
  );
}
