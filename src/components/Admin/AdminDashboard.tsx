"use client";

import React, { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import moment from "moment";
import { getPermissionNames } from "@/lib/permission-presets";
import { Search, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import EditUserDialog from "./EditUserDialog";
import AccountsTable from "./AccountsTable";
import ReviewPoolsPanel from "./ReviewPoolsPanel";
import type {
  ReviewCandidate,
  ReviewPool,
} from "@/app/review-actions";
import {
  AdminTableShell,
  AdminToolbar,
  AdminTableFooter,
  STICKY_HEADER,
  TABLE_EDGE_PADDING,
} from "./AdminTableShell";

const DETAIL_LABELS: Record<string, string> = {
  petitionId: "Petition",
  updateId: "Update",
  responseId: "Response",
  targetUserId: "User ID",
  targetEmail: "User",
  tierId: "Tier",
  categoryName: "Category",
  title: "Title",
  inProgress: "In progress",
  before: "Before",
  after: "After",
  permissionsBefore: "Permissions before",
  permissionsAfter: "Permissions after",
  update: "Update notifications",
  response: "Response notifications",
  reported: "Report notifications",
  threshold: "Threshold notifications",
  isStaff: "Staff",
  permissions: "Permissions",
  delivery: "Password delivery",
  emailSent: "Reset email sent",
};

const PERMISSION_KEYS = new Set([
  "before",
  "after",
  "permissions",
  "permissionsBefore",
  "permissionsAfter",
]);

function formatDetailValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";

  if (PERMISSION_KEYS.has(key) && typeof value === "number") {
    const names = getPermissionNames(value);
    return names.length > 0
      ? `${names.join(", ")} (${value})`
      : `None (${value})`;
  }

  if (key === "petitionId" || key === "updateId" || key === "responseId") {
    return `#${value}`;
  }

  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);

  return String(value);
}

function parseDetails(
  details: string | null | undefined,
): { label: string; value: string }[] | null {
  if (!details) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(details);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  return Object.entries(parsed as Record<string, unknown>).map(
    ([key, value]) => ({
      label: DETAIL_LABELS[key] ?? key,
      value: formatDetailValue(key, value),
    }),
  );
}

function summariseDetails(details: string | null | undefined): string {
  const pairs = parseDetails(details);
  if (!pairs) return details ?? "";
  return pairs.map((p) => `${p.label}: ${p.value}`).join(" · ");
}

interface AdminDashboardProps {
  logs: any[];
  users: any[];
  currentUserId: string | null;
  superAdminCount: number;
  pools: ReviewPool[];
  poolCandidates: ReviewCandidate[];
}

export default function AdminDashboard({
  logs,
  users,
  currentUserId,
  superAdminCount,
  pools,
  poolCandidates,
}: AdminDashboardProps) {
  // Logs State
  const [logSearch, setLogSearch] = useState("");
  const [logActionFilter, setLogActionFilter] = useState("All");
  const [viewingLog, setViewingLog] = useState<any | null>(null);

  // Users State
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("All");
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Filtered Logs
  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map((log) => log.action));
    return ["All", ...Array.from(actions)];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        logSearch === "" ||
        log.action.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.user?.name?.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.user?.email?.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.details?.toLowerCase().includes(logSearch.toLowerCase());

      const matchesFilter =
        logActionFilter === "All" || log.action === logActionFilter;

      return matchesSearch && matchesFilter;
    });
  }, [logs, logSearch, logActionFilter]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        userSearch === "" ||
        user.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        user.email?.toLowerCase().includes(userSearch.toLowerCase());

      let matchesFilter = true;
      if (userRoleFilter === "Super Admin") {
        matchesFilter = user.isSuperAdmin;
      } else if (userRoleFilter === "Staff") {
        matchesFilter = user.isStaff && !user.isSuperAdmin;
      } else if (userRoleFilter === "User") {
        matchesFilter = !user.isStaff && !user.isSuperAdmin;
      }

      return matchesSearch && matchesFilter;
    });
  }, [users, userSearch, userRoleFilter]);

  const issuedAccountCount = useMemo(
    () => users.filter((user) => user.authProvider === "password").length,
    [users],
  );

  return (
    <AdminTableShell>
      <Tabs defaultValue="logs" className="flex min-h-0 flex-1 flex-col gap-0">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-3 py-3 sm:px-4 lg:px-8">
          <h1 className="text-xl font-bold sm:text-2xl">Admin</h1>
          {/* Scrolls rather than wraps: three tabs plus counts overflow a
              360px viewport, and a wrapped row would push the table down. */}
          <div className="-mx-3 max-w-full overflow-x-auto px-3 sm:mx-0 sm:px-0">
            <TabsList>
              <TabsTrigger value="logs">Audit Logs</TabsTrigger>
              <TabsTrigger value="users">
                Users
                <span className="text-xs text-muted-foreground">
                  {users.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="accounts">
                Accounts
                <span className="text-xs text-muted-foreground">
                  {issuedAccountCount}
                </span>
              </TabsTrigger>
              <TabsTrigger value="reviewers">Reviewers</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent
          value="logs"
          className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          <AdminToolbar>
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={logActionFilter} onValueChange={setLogActionFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                {uniqueActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AdminToolbar>

          <Table containerClassName="min-h-0 flex-1" className={TABLE_EDGE_PADDING}>
            <TableHeader className={STICKY_HEADER}>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No logs found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="py-2">
                      <Badge variant="outline">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {log.user?.name || "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {log.user?.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[320px] py-2">
                      {log.details ? (
                        <button
                          type="button"
                          onClick={() => setViewingLog(log)}
                          className="block w-full truncate text-left text-xs hover:text-primary hover:underline"
                          title="Click to view full details"
                        >
                          {summariseDetails(log.details)}
                        </button>
                      ) : null}
                    </TableCell>
                    <TableCell className="py-2 text-xs text-muted-foreground">
                      {moment(log.createdAt).format("MMM D, YYYY h:mm A")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <AdminTableFooter>
            Showing {filteredLogs.length} of {logs.length} logs
          </AdminTableFooter>
        </TabsContent>

        <TabsContent
          value="users"
          className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          <AdminToolbar>
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Roles</SelectItem>
                <SelectItem value="Super Admin">Super Admin</SelectItem>
                <SelectItem value="Staff">Staff</SelectItem>
                <SelectItem value="User">User</SelectItem>
              </SelectContent>
            </Select>
          </AdminToolbar>

          <Table containerClassName="min-h-0 flex-1" className={TABLE_EDGE_PADDING}>
            <TableHeader className={STICKY_HEADER}>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Sign-in</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Petitions</TableHead>
                <TableHead>Signed</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[70px] text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No users found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="py-2 font-medium">
                      {user.name || "No Name"}
                    </TableCell>
                    <TableCell className="py-2">{user.email}</TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline">
                          {user.authProvider === "password"
                            ? "Password"
                            : "Google"}
                        </Badge>
                        {user.disabled && (
                          <Badge variant="destructive">Disabled</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      {user.isSuperAdmin ? (
                        <Badge variant="destructive">Super Admin</Badge>
                      ) : user.isStaff ? (
                        <Badge variant="default">Staff</Badge>
                      ) : (
                        <Badge variant="secondary">User</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-muted-foreground">
                          {user.permissions || 0}
                        </span>
                        {getPermissionNames(user.permissions || 0).map((p) => (
                          <Badge
                            key={p}
                            variant="outline"
                            className="h-4 px-1 text-[10px]"
                          >
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      {user._count?.createdPetitions || 0}
                    </TableCell>
                    <TableCell className="py-2">
                      {user._count?.signedPetitions || 0}
                    </TableCell>
                    <TableCell className="py-2 text-xs text-muted-foreground">
                      {moment(user.createdAt).format("MMM D, YYYY")}
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingUser(user)}
                        aria-label={`Edit access for ${user.name || user.email}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <AdminTableFooter>
            Showing {filteredUsers.length} of {users.length} users
          </AdminTableFooter>
        </TabsContent>

        <TabsContent
          value="accounts"
          className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          <AccountsTable users={users} currentUserId={currentUserId} />
        </TabsContent>

        <TabsContent
          value="reviewers"
          className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          <ReviewPoolsPanel pools={pools} candidates={poolCandidates} />
        </TabsContent>
      </Tabs>

      {editingUser && (
        <EditUserDialog
          key={editingUser.id}
          user={editingUser}
          currentUserId={currentUserId}
          superAdminCount={superAdminCount}
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
        />
      )}
      {viewingLog && (
        <Dialog open onOpenChange={() => setViewingLog(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{viewingLog.action}</DialogTitle>
              <DialogDescription>
                {viewingLog.user?.name || "Unknown"}
                {viewingLog.user?.email ? ` (${viewingLog.user.email})` : ""}
                {" · "}
                {moment(viewingLog.createdAt).format("MMM D, YYYY h:mm A")}
              </DialogDescription>
            </DialogHeader>
            {(() => {
              const pairs = parseDetails(viewingLog.details);

              if (!pairs) {
                return (
                  <pre className="max-h-[60vh] overflow-auto rounded bg-muted p-3 text-xs break-all whitespace-pre-wrap">
                    {viewingLog.details || "No details recorded."}
                  </pre>
                );
              }

              return (
                <dl className="max-h-[60vh] overflow-auto rounded bg-muted p-4 text-sm">
                  {pairs.map((pair) => (
                    <div
                      key={pair.label}
                      className="flex flex-col gap-1 border-b border-border/40 py-1.5 last:border-0 sm:flex-row sm:gap-4"
                    >
                      <dt className="shrink-0 text-muted-foreground sm:w-44">
                        {pair.label}
                      </dt>
                      <dd className="flex-1 break-words">{pair.value}</dd>
                    </div>
                  ))}
                </dl>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}
    </AdminTableShell>
  );
}
