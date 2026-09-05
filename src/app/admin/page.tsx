import { AdminGuard } from "@/components";
import AdminDashboard from "@/components/Admin/AdminDashboard";
import {
  getAuditLogs,
  getAuditLogActions,
  getUsers,
  getStaffPermissions,
  getCurrentUserId,
} from "@/app/actions";
import { ADMIN_PAGE_SIZE } from "@/lib/constants";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const perms = await getStaffPermissions();
  if (!perms.isSuperAdmin) {
    redirect("/");
  }

  // The first page is rendered on the server as before; the dashboard fetches
  // any page after this one itself.
  let logPage: {
    logs: any[];
    total: number;
  } = { logs: [], total: 0 };
  let userPage: {
    users: any[];
    total: number;
    superAdminCount: number;
  } = { users: [], total: 0, superAdminCount: 0 };
  let logActions: string[] = [];

  try {
    const data = await Promise.all([
      getAuditLogs().catch((e) => {
        console.error("Failed to fetch logs:", e);
        return { logs: [], total: 0 };
      }),
      getUsers().catch((e) => {
        console.error("Failed to fetch users:", e);
        return { users: [], total: 0, superAdminCount: 0 };
      }),
      getAuditLogActions().catch((e) => {
        console.error("Failed to fetch log actions:", e);
        return [] as string[];
      }),
    ]);
    logPage = data[0];
    userPage = data[1];
    logActions = data[2];
  } catch (error) {
    console.error("Error loading admin data:", error);
  }

  const currentUserId = await getCurrentUserId();

  return (
    <AdminGuard>
      <AdminDashboard
        initialLogs={logPage.logs}
        initialLogTotal={logPage.total}
        logActions={logActions}
        initialUsers={userPage.users}
        initialUserTotal={userPage.total}
        pageSize={ADMIN_PAGE_SIZE}
        currentUserId={currentUserId}
        // Needed by the editor dialog to disable self-affecting controls: a
        // superadmin cannot demote themselves, nor remove the last superadmin.
        // Counted in the database, not over the fetched page.
        superAdminCount={userPage.superAdminCount}
      />
    </AdminGuard>
  );
}
