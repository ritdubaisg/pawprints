"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, KeyRound, Loader2, Mail } from "lucide-react";
import {
  createManagedAccount,
  type AccountDelivery,
  type IssuedCredentials,
} from "@/app/account-actions";
import { ALLOWED_EMAIL_DESCRIPTION, isAllowedEmail } from "@/lib/email-domain";
import { PERMISSION_PRESETS } from "@/lib/permission-presets";

interface CreateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (credentials: IssuedCredentials) => void;
}

function DeliveryOption({
  icon,
  title,
  description,
  selected,
  onSelect,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors disabled:opacity-50 ${
        selected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
      }`}
    >
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">
          {description}
        </span>
      </span>
    </button>
  );
}

/**
 * Issues a password account for someone without a Google identity — faculty
 * and staff. Students never need this: they self-provision through Google.
 */
export default function CreateAccountDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateAccountDialogProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isStaff, setIsStaff] = useState(false);
  const [permissions, setPermissions] = useState(0);
  const [delivery, setDelivery] = useState<AccountDelivery>("email");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const emailLooksWrong = email.length > 0 && !isAllowedEmail(email);
  const canSubmit =
    name.trim().length > 0 && isAllowedEmail(email) && !saving;

  const reset = () => {
    setEmail("");
    setName("");
    setIsStaff(false);
    setPermissions(0);
    setDelivery("email");
    setError(null);
  };

  const handleStaffToggle = (next: boolean) => {
    setIsStaff(next);
    // The server rejects permissions on a non-staff account, so the form
    // cannot be left in a state it would refuse.
    if (!next) setPermissions(0);
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const credentials = await createManagedAccount({
        email,
        name,
        isStaff,
        permissions,
        delivery,
      });
      reset();
      onOpenChange(false);
      onCreated(credentials);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Could not create the account.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Issue an account</DialogTitle>
          <DialogDescription>
            Creates a password sign-in for someone without an RIT Google
            account — faculty and staff.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="account-email">RIT email</Label>
            <Input
              id="account-email"
              type="email"
              placeholder="name@rit.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={saving}
              autoComplete="off"
            />
            <p
              className={`text-xs ${emailLooksWrong ? "text-destructive" : "text-muted-foreground"}`}
            >
              Must be an {ALLOWED_EMAIL_DESCRIPTION} address.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-name">Full name</Label>
            <Input
              id="account-name"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
              maxLength={100}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-sm font-medium">First password</Label>

            <div className="grid gap-2">
              <DeliveryOption
                icon={<Mail className="h-4 w-4" />}
                title="Email a set-password link"
                description="Firebase emails them a link to choose their own password. Nothing to relay."
                selected={delivery === "email"}
                onSelect={() => setDelivery("email")}
                disabled={saving}
              />
              <DeliveryOption
                icon={<KeyRound className="h-4 w-4" />}
                title="Show me a temporary password"
                description="Shown once, for you to hand over. They must replace it at first sign-in."
                selected={delivery === "password"}
                onSelect={() => setDelivery("password")}
                disabled={saving}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-sm font-medium">Access</Label>

            <button
              type="button"
              onClick={() => handleStaffToggle(!isStaff)}
              disabled={saving}
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

            {isStaff && (
              <div className="space-y-2">
                <Label htmlFor="account-permissions" className="text-xs">
                  Permissions
                </Label>
                <Select
                  value={String(permissions)}
                  onValueChange={(v) => setPermissions(Number(v))}
                >
                  <SelectTrigger id="account-permissions">
                    <SelectValue placeholder="Choose a preset…" />
                  </SelectTrigger>
                  <SelectContent>
                    {PERMISSION_PRESETS.map((preset) => (
                      <SelectItem key={preset.label} value={String(preset.value)}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Fine-tune individual permissions from the Users tab after the
                  account exists.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
