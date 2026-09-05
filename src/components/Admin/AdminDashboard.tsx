"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { PERMISSIONS } from "@/lib/permissions";
import { Search, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import EditUserDialog from "./EditUserDialog";
import { getAuditLogs, getUsers } from "@/app/actions";
import { toast } from "sonner";

const getPermissionNames = (permInt: number) => {
  if (!permInt) return [];
  const names: string[] = [];
  for (const [key, value] of Object.entries(PERMISSIONS)) {
    if (typeof value === "number" && (permInt & value) === value) {
      names.push(key);
    }
  }
  return names;
};

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
};

const PERMISSION_KEYS = new Set([
  "before",
  "after",
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
  initialLogs: any[];
  initialLogTotal: number;
  logActions: string[];
  initialUsers: any[];
  initialUserTotal: number;
  pageSize: number;
  currentUserId: string | null;
  superAdminCount: number;
}

/** How long to wait after the last keystroke before querying. */
const SEARCH_DEBOUNCE_MS = 300;

/** How many numbered buttons the pager shows at once. */
const PAGE_WINDOW = 4;

/**
 * The window of page numbers to offer: the current page and its nearest
 * neighbours, clamped so the window never runs past either end.
 */
function pageWindow(current: number, totalPages: number) {
  if (totalPages <= PAGE_WINDOW) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // Keep one page behind the current one visible where there is room, so
  // stepping forward does not immediately redraw the whole window.
  const start = Math.max(
    1,
    Math.min(current - 1, totalPages - PAGE_WINDOW + 1),
  );

  return Array.from({ length: PAGE_WINDOW }, (_, i) => start + i);
}

function Pager({
  page,
  totalPages,
  disabled,
  onChange,
  label,
}: {
  page: number;
  totalPages: number;
  disabled: boolean;
  onChange: (page: number) => void;
  label: string;
}) {
  return (
    <nav
      aria-label={label}
      className="flex items-center gap-1 self-end sm:self-auto"
    >
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Back
      </Button>

      {pageWindow(page, totalPages).map((n) => (
        <Button
          key={n}
          variant={n === page ? "default" : "outline"}
          size="sm"
          className="w-9 px-0"
          disabled={disabled}
          aria-current={n === page ? "page" : undefined}
          aria-label={`Page ${n}`}
          onClick={() => onChange(n)}
        >
          {n}
        </Button>
      ))}

      <Button
        variant="outline"
        size="sm"
        disabled={disabled || page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}

export default function AdminDashboard({
  initialLogs,
  initialLogTotal,
  logActions,
  initialUsers,
  initialUserTotal,
  pageSize,
  currentUserId,
  superAdminCount,
}: AdminDashboardProps) {
  // Logs State
  const [logs, setLogs] = useState<any[]>(initialLogs);
  const [logTotal, setLogTotal] = useState(initialLogTotal);
  const [logPage, setLogPage] = useState(1);
  const [logSearchInput, setLogSearchInput] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const [logActionFilter, setLogActionFilter] = useState("All");
  const [logLoading, setLogLoading] = useState(false);
  const [viewingLog, setViewingLog] = useState<any | null>(null);

  // Users State
  const [users, setUsers] = useState<any[]>(initialUsers);
  const [userTotal, setUserTotal] = useState(initialUserTotal);
  const [userPage, setUserPage] = useState(1);
  const [userSearchInput, setUserSearchInput] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("All");
  const [userLoading, setUserLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Every action ever recorded, not just those on the page being shown.
  const actionOptions = ["All", ...logActions];
  const logPageCount = Math.max(Math.ceil(logTotal / pageSize), 1);
  const userPageCount = Math.max(Math.ceil(userTotal / pageSize), 1);

  // Debounce both search boxes so typing does not fire a query per keystroke.
  useEffect(() => {
    const timer = setTimeout(
      () => setLogSearch(logSearchInput),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [logSearchInput]);

  useEffect(() => {
    const timer = setTimeout(
      () => setUserSearch(userSearchInput),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [userSearchInput]);

  const loadLogs = useCallback(
    async (page: number) => {
      setLogLoading(true);
      try {
        const result = await getAuditLogs({
          page,
          search: logSearch,
          action: logActionFilter,
        });
        setLogs(result.logs);
        setLogTotal(result.total);
        setLogPage(result.page);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load audit logs");
      } finally {
        setLogLoading(false);
      }
    },
    [logSearch, logActionFilter],
  );

  const loadUsers = useCallback(
    async (page: number) => {
      setUserLoading(true);
      try {
        const result = await getUsers({
          page,
          search: userSearch,
          role: userRoleFilter,
        });
        setUsers(result.users);
        setUserTotal(result.total);
        setUserPage(result.page);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load users");
      } finally {
        setUserLoading(false);
      }
    },
    [userSearch, userRoleFilter],
  );

  // A new search or filter starts again from the first page. Both effects skip
  // their first run, where the server has already supplied that page.
  const logsMounted = useRef(false);
  useEffect(() => {
    if (!logsMounted.current) {
      logsMounted.current = true;
      return;
    }
    loadLogs(1);
  }, [logSearch, logActionFilter, loadLogs]);

  const usersMounted = useRef(false);
  useEffect(() => {
    if (!usersMounted.current) {
      usersMounted.current = true;
      return;
    }
    loadUsers(1);
  }, [userSearch, userRoleFilter, loadUsers]);

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <Tabs defaultValue="logs">
        <TabsList className="mb-4">
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>System Audit Logs</CardTitle>
              <CardDescription>
                View all system actions and events.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs (action, user, details)..."
                    value={logSearchInput}
                    onChange={(e) => setLogSearchInput(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select
                  value={logActionFilter}
                  onValueChange={setLogActionFilter}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by Action" />
                  </SelectTrigger>
                  <SelectContent>
                    {actionOptions.map((action) => (
                      <SelectItem key={action} value={action}>
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea
                className={`h-[600px] border rounded-md transition-opacity ${
                  logLoading ? "opacity-60" : ""
                }`}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="h-24 text-center text-muted-foreground"
                        >
                          {logLoading
                            ? "Loading logs..."
                            : "No logs found matching your criteria."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="py-2">
                            <Badge variant="outline">{log.action}</Badge>
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">
                                {log.user?.name || "Unknown"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {log.user?.email}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[300px] py-2">
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
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground py-2">
                            {moment(log.createdAt).format("MMM D, YYYY h:mm A")}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  Showing {logs.length} of {logTotal} logs
                </span>
                <Pager
                  page={logPage}
                  totalPages={logPageCount}
                  disabled={logLoading}
                  onChange={loadLogs}
                  label="Audit log pages"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>Manage system users.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users (name, email)..."
                    value={userSearchInput}
                    onChange={(e) => setUserSearchInput(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select
                  value={userRoleFilter}
                  onValueChange={setUserRoleFilter}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Roles</SelectItem>
                    <SelectItem value="Super Admin">Super Admin</SelectItem>
                    <SelectItem value="Staff">Staff</SelectItem>
                    <SelectItem value="User">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea
                className={`h-[600px] border rounded-md transition-opacity ${
                  userLoading ? "opacity-60" : ""
                }`}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Petitions</TableHead>
                      <TableHead>Signed</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="h-24 text-center text-muted-foreground"
                        >
                          {userLoading
                            ? "Loading users..."
                            : "No users found matching your criteria."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium py-2">
                            {user.name || "No Name"}
                          </TableCell>
                          <TableCell className="py-2">{user.email}</TableCell>
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
                            <div className="flex flex-col gap-1">
                              <span className="font-mono text-xs text-muted-foreground">
                                {user.permissions || 0}
                              </span>
                              {getPermissionNames(user.permissions || 0)
                                .length > 0 && (
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {getPermissionNames(
                                    user.permissions || 0,
                                  ).map((p) => (
                                    <Badge
                                      key={p}
                                      variant="outline"
                                      className="text-[10px] h-4 px-1"
                                    >
                                      {p}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            {user._count?.createdPetitions || 0}
                          </TableCell>
                          <TableCell className="py-2">
                            {user._count?.signedPetitions || 0}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground py-2">
                            {moment(user.createdAt).format("MMM D, YYYY")}
                          </TableCell>
                          <TableCell className="py-2">
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
              </ScrollArea>
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  Showing {users.length} of {userTotal} users
                </span>
                <Pager
                  page={userPage}
                  totalPages={userPageCount}
                  disabled={userLoading}
                  onChange={loadUsers}
                  label="User pages"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {editingUser && (
        <EditUserDialog
          key={editingUser.id}
          user={editingUser}
          currentUserId={currentUserId}
          superAdminCount={superAdminCount}
          open={!!editingUser}
          onOpenChange={(open) => {
            if (open) return;
            setEditingUser(null);
            // Role and permission changes revalidate /admin, which used to be
            // enough to refresh both tables. The rows now live in state, so
            // the page being viewed has to be refetched explicitly.
            loadUsers(userPage);
            loadLogs(logPage);
          }}
        />
      )}
      {viewingLog && (
        <Dialog open onOpenChange={() => setViewingLog(null)}>
          <DialogContent className="max-w-2xl">
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
                  <pre className="max-h-[60vh] overflow-auto rounded bg-muted p-3 text-xs whitespace-pre-wrap break-all">
                    {viewingLog.details || "No details recorded."}
                  </pre>
                );
              }

              return (
                <dl className="max-h-[60vh] overflow-auto rounded bg-muted p-4 text-sm">
                  {pairs.map((pair) => (
                    <div
                      key={pair.label}
                      className="flex gap-4 py-1.5 border-b border-border/40 last:border-0"
                    >
                      <dt className="w-44 shrink-0 text-muted-foreground">
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
    </div>
  );
}
