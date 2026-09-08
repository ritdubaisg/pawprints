"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Ban,
  CircleCheck,
  Copy,
  KeyRound,
  Link2,
  Loader2,
  Mail,
  MoreHorizontal,
  Search,
  UserPlus,
} from "lucide-react";
import moment from "moment";
import { toast } from "sonner";
import {
  createPasswordResetLink,
  regenerateAccountPassword,
  sendAccountPasswordResetEmail,
  setAccountDisabled,
  type IssuedCredentials,
} from "@/app/account-actions";
import CreateAccountDialog from "./CreateAccountDialog";
import CredentialsDialog from "./CredentialsDialog";
import {
  AdminToolbar,
  AdminTableFooter,
  STICKY_HEADER,
} from "./AdminTableShell";

interface AccountsTableProps {
  /** Every user row; this table shows only the issued password accounts. */
  users: any[];
  currentUserId: string | null;
}

type PendingAction = { userId: string; kind: string } | null;

/**
 * An issued account moves through three states, and the difference matters
 * when deciding what to do about one:
 *
 * - invited: emailed a set-password link they have not used yet
 * - temporary: holding a password a superadmin has seen
 * - active: using a password only they know
 */
function accountStatus(user: any) {
  if (user.disabled) {
    return { label: "Disabled", variant: "destructive" as const };
  }
  if (user.mustChangePassword) {
    return { label: "Temporary password", variant: "outline" as const };
  }
  if (!user.passwordUpdatedAt) {
    return { label: "Invited", variant: "outline" as const };
  }
  return { label: "Active", variant: "secondary" as const };
}

export default function AccountsTable({
  users,
  currentUserId,
}: AccountsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState<any | null>(null);
  const [resetLink, setResetLink] = useState<{
    email: string;
    link: string;
  } | null>(null);
  const [credentials, setCredentials] = useState<
    (IssuedCredentials & { title: string; description: string }) | null
  >(null);

  const accounts = useMemo(
    () => users.filter((user) => user.authProvider === "password"),
    [users],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return accounts;
    return accounts.filter(
      (account) =>
        account.name?.toLowerCase().includes(query) ||
        account.email?.toLowerCase().includes(query),
    );
  }, [accounts, search]);

  function handleCreated(result: IssuedCredentials) {
    if (result.delivery === "password" && result.password) {
      setCredentials({
        ...result,
        title: "Account created",
        description:
          "Hand these details over directly. They will be asked to choose their own password when they first sign in.",
      });
      return;
    }

    if (result.emailSent) {
      toast.success(`Set-password link emailed to ${result.email}`);
    } else {
      // The account exists either way, so this has to be actionable rather
      // than a bare failure.
      toast.error(
        `Account created, but the email to ${result.email} did not send. Use Send set-password email, or regenerate a password to hand over.`,
        { duration: 10000 },
      );
    }
  }

  async function handleRegenerate(user: any) {
    setConfirmRegenerate(null);
    setPending({ userId: user.id, kind: "regenerate" });
    try {
      const result = await regenerateAccountPassword(user.id);
      setCredentials({
        ...result,
        title: "New password issued",
        description: `${user.name || user.email} has been signed out everywhere and must set a new password at their next sign-in.`,
      });
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Could not regenerate the password");
    } finally {
      setPending(null);
    }
  }

  async function handleSendResetEmail(user: any) {
    setPending({ userId: user.id, kind: "email" });
    try {
      await sendAccountPasswordResetEmail(user.id);
      toast.success(`Set-password link emailed to ${user.email}`);
    } catch (error: any) {
      toast.error(error?.message || "Could not send the email");
    } finally {
      setPending(null);
    }
  }

  async function handleResetLink(user: any) {
    setPending({ userId: user.id, kind: "link" });
    try {
      const link = await createPasswordResetLink(user.id);
      setResetLink({ email: user.email, link });
    } catch (error: any) {
      toast.error(error?.message || "Could not create a reset link");
    } finally {
      setPending(null);
    }
  }

  async function handleDisabled(user: any, disabled: boolean) {
    setPending({ userId: user.id, kind: "disable" });
    try {
      await setAccountDisabled(user.id, disabled);
      toast.success(disabled ? "Account disabled" : "Account enabled");
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Could not update the account");
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      <AdminToolbar>
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search issued accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button onClick={() => setCreateOpen(true)} className="sm:w-auto">
          <UserPlus className="mr-2 h-4 w-4" />
          Issue account
        </Button>
      </AdminToolbar>

      <Table containerClassName="min-h-0 flex-1">
        <TableHeader className={STICKY_HEADER}>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Password set</TableHead>
            <TableHead>Issued</TableHead>
            <TableHead className="w-[60px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="h-24 px-4 text-center text-muted-foreground whitespace-normal"
              >
                {accounts.length === 0
                  ? "No accounts have been issued yet. Faculty and staff without an RIT Google account need one."
                  : "No accounts match your search."}
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((user) => {
              const busy = pending?.userId === user.id;
              const status = accountStatus(user);
              return (
                <TableRow
                  key={user.id}
                  className={user.disabled ? "opacity-60" : ""}
                >
                  <TableCell className="py-2 font-medium">
                    {user.name || "No Name"}
                  </TableCell>
                  <TableCell className="py-2">{user.email}</TableCell>
                  <TableCell className="py-2">
                    <Badge variant={status.variant}>{status.label}</Badge>
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
                  <TableCell className="py-2 text-xs text-muted-foreground">
                    {user.passwordUpdatedAt
                      ? moment(user.passwordUpdatedAt).format("MMM D, YYYY")
                      : "Not yet"}
                  </TableCell>
                  <TableCell className="py-2 text-xs text-muted-foreground">
                    {moment(user.createdAt).format("MMM D, YYYY")}
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          aria-label={`Actions for ${user.name || user.email}`}
                        >
                          {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-60">
                        <DropdownMenuLabel>Password</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => handleSendResetEmail(user)}
                          disabled={user.disabled}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Send set-password email
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleResetLink(user)}
                          disabled={user.disabled}
                        >
                          <Link2 className="mr-2 h-4 w-4" />
                          Copy set-password link
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setConfirmRegenerate(user)}
                        >
                          <KeyRound className="mr-2 h-4 w-4" />
                          Regenerate password
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Access</DropdownMenuLabel>
                        {user.disabled ? (
                          <DropdownMenuItem
                            onClick={() => handleDisabled(user, false)}
                          >
                            <CircleCheck className="mr-2 h-4 w-4" />
                            Enable account
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDisabled(user, true)}
                            disabled={user.id === currentUserId}
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            Disable account
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <AdminTableFooter>
        Showing {filtered.length} of {accounts.length} issued accounts
      </AdminTableFooter>

      <CreateAccountDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />

      {credentials && credentials.password && (
        <CredentialsDialog
          open
          onOpenChange={(open) => !open && setCredentials(null)}
          title={credentials.title}
          description={credentials.description}
          email={credentials.email}
          password={credentials.password}
        />
      )}

      {confirmRegenerate && (
        <Dialog open onOpenChange={() => setConfirmRegenerate(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Regenerate password?</DialogTitle>
              <DialogDescription>
                {confirmRegenerate.name || confirmRegenerate.email} will be
                signed out of every session and their current password will
                stop working immediately. Prefer emailing a set-password link
                unless they cannot reach their inbox.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="ghost"
                onClick={() => setConfirmRegenerate(null)}
              >
                Cancel
              </Button>
              <Button onClick={() => handleRegenerate(confirmRegenerate)}>
                Regenerate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {resetLink && (
        <Dialog open onOpenChange={() => setResetLink(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Set-password link</DialogTitle>
              <DialogDescription>
                A single-use link for {resetLink.email}. Send it to them
                directly — it lets them set their own password without you
                seeing it.
              </DialogDescription>
            </DialogHeader>
            <code className="block max-h-40 overflow-auto rounded-md border bg-muted p-3 font-mono text-xs break-all">
              {resetLink.link}
            </code>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(resetLink.link);
                    toast.success("Link copied");
                  } catch {
                    toast.error("Could not copy — select the link manually.");
                  }
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy link
              </Button>
              <Button onClick={() => setResetLink(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
