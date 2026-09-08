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
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, Copy, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

interface CredentialsDialogProps {
  title: string;
  description: string;
  email: string;
  password: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — select the text and copy it manually.");
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto rounded-md border bg-muted px-3 py-2 font-mono text-sm whitespace-nowrap">
          {value}
        </code>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={copy}
          aria-label={`Copy ${label.toLowerCase()}`}
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * The one and only time a generated password is visible. Firebase stores it
 * hashed, so nothing here can be recovered later — losing it means
 * regenerating, which is why the dialog says so plainly.
 */
export default function CredentialsDialog({
  title,
  description,
  email,
  password,
  open,
  onOpenChange,
}: CredentialsDialogProps) {
  const copyBoth = async () => {
    try {
      await navigator.clipboard.writeText(
        `PawPrints sign-in\nEmail: ${email}\nTemporary password: ${password}`,
      );
      toast.success("Copied sign-in details");
    } catch {
      toast.error("Could not copy — select the text and copy it manually.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <TriangleAlert className="h-4 w-4" />
            <AlertDescription>
              This password is shown once. Copy it now and hand it over
              directly — if it is lost, generate a new one.
            </AlertDescription>
          </Alert>

          <CopyRow label="Email" value={email} />
          <CopyRow label="Temporary password" value={password} />

          <p className="text-xs text-muted-foreground">
            The holder is asked to choose their own password the first time
            they sign in.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={copyBoth}>
            <Copy className="mr-2 h-4 w-4" />
            Copy both
          </Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
