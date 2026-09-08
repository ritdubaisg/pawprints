"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PERMISSIONS } from "@/lib/permissions";
import {
  PERMISSION_LABELS,
  PERMISSION_PRESETS,
} from "@/lib/permission-presets";
import {
  updateUserPermissions,
  setStaffStatus,
  setSuperAdminStatus,
} from "@/app/actions";
import { toast } from "sonner";
import { Loader2, ShieldAlert } from "lucide-react";

interface EditUserDialogProps {
  user: any;
  currentUserId: string | null;
  superAdminCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditUserDialog({
  user,
  currentUserId,
  superAdminCount,
  open,
  onOpenChange,
}: EditUserDialogProps) {
  const [permissions, setPermissions] = useState<number>(user.permissions || 0);
  const [isStaff, setIsStaff] = useState<boolean>(!!user.isStaff);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(
    !!user.isSuperAdmin,
  );
  const [saving, setSaving] = useState(false);

  const isSelf = currentUserId === user.id;
  const isLastSuperAdmin = user.isSuperAdmin && superAdminCount <= 1;
  const superAdminLocked = isSelf || isLastSuperAdmin;

  const togglePermission = (bit: number) => {
    setPermissions((prev) => (prev & bit ? prev & ~bit : prev | bit));
  };

  const handleStaffToggle = (next: boolean) => {
    setIsStaff(next);
    // Mirrors the server: revoking staff clears every permission, so the
    // dialog cannot imply bits survive when they will not.
    if (!next) setPermissions(0);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isSuperAdmin !== !!user.isSuperAdmin) {
        await setSuperAdminStatus(user.id, isSuperAdmin);
      }
      if (isStaff !== !!user.isStaff) {
        await setStaffStatus(user.id, isStaff);
      }
      if (permissions !== (user.permissions || 0) && isStaff) {
        await updateUserPermissions(user.id, permissions);
      }
      toast.success("User updated");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit access</DialogTitle>
          <DialogDescription>
            {user.name || "No name"} &middot; {user.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Role</Label>

            <button
              type="button"
              onClick={() => handleStaffToggle(!isStaff)}
              disabled={isSuperAdmin}
              className="flex w-full items-center justify-between rounded-md border p-3 text-left disabled:opacity-50"
            >
              <div>
                <div className="text-sm font-medium">Staff</div>
                <div className="text-xs text-muted-foreground">
                  Can access the review dashboard
                </div>
              </div>
              <Badge variant={isStaff ? "default" : "secondary"}>
                {isStaff ? "Yes" : "No"}
              </Badge>
            </button>

            <button
              type="button"
              onClick={() => setIsSuperAdmin(!isSuperAdmin)}
              disabled={superAdminLocked}
              className="flex w-full items-center justify-between rounded-md border p-3 text-left disabled:opacity-50"
            >
              <div>
                <div className="text-sm font-medium">Super Admin</div>
                <div className="text-xs text-muted-foreground">
                  Full access, bypasses all permission checks
                </div>
              </div>
              <Badge variant={isSuperAdmin ? "destructive" : "secondary"}>
                {isSuperAdmin ? "Yes" : "No"}
              </Badge>
            </button>

            {superAdminLocked && (
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {isSelf
                  ? "You cannot change your own superadmin access."
                  : "This is the last superadmin and cannot be demoted."}
              </p>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Permissions</Label>
              <span className="font-mono text-xs text-muted-foreground">
                {permissions}
              </span>
            </div>

            {isSuperAdmin ? (
              <p className="text-xs text-muted-foreground">
                Super admins bypass individual permissions.
              </p>
            ) : !isStaff ? (
              <p className="text-xs text-muted-foreground">
                Grant staff access first — permissions have no effect without
                it.
              </p>
            ) : (
              <>
                <Select
                  onValueChange={(v) => setPermissions(Number(v))}
                  value={
                    PERMISSION_PRESETS.find((p) => p.value === permissions)
                      ? String(permissions)
                      : undefined
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Apply a preset…" />
                  </SelectTrigger>
                  <SelectContent>
                    {PERMISSION_PRESETS.map((p) => (
                      <SelectItem key={p.label} value={String(p.value)}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="space-y-1">
                  {(
                    Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]
                  ).map((key) => {
                    const bit = PERMISSIONS[key];
                    const enabled = (permissions & bit) === bit;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => togglePermission(bit)}
                        className="flex w-full items-center gap-3 rounded-md border p-2 text-left hover:bg-muted/50"
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                            enabled
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-input"
                          }`}
                        >
                          {enabled ? "✓" : ""}
                        </span>
                        <span className="flex-1 text-xs">
                          {PERMISSION_LABELS[key]}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {bit}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
