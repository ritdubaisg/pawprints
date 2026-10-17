"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Shown on the create page and again in the submit dialog: the one thing a
 * petition author must not miss is that complaints about a person do not
 * belong here.
 */
export function IncidentNotice({ className }: { className?: string }) {
  return (
    <p className={className}>
      Please remember, if this petition is about another person, staff, or
      faculty member, talk to Student Affairs or{" "}
      <a
        href="https://www.rit.edu/dubai/incident-report"
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline"
      >
        report an incident
      </a>{" "}
      instead. Student Government reserves the right to edit or remove any
      petition at any time for violating the Code of Conduct. This includes, but
      is not limited to, creating an intimidating, hostile, or abusive
      environment for any member of the RIT community, or posting of any
      obscene, defamatory, threatening, or otherwise harassing petitions.
    </p>
  );
}

interface SubmitForReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

/**
 * The last step before a petition goes to review. Submitting is gated on the
 * author ticking that they agree to the terms, which used to sit as fine
 * print under the form where nobody had to read it.
 */
export function SubmitForReviewDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
}: SubmitForReviewDialogProps) {
  const [agreed, setAgreed] = useState(false);

  // Agreement is per submission, not remembered from a previous opening.
  useEffect(() => {
    if (open) setAgreed(false);
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isSubmitting) onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Before you submit</DialogTitle>
          <DialogDescription>
            Your petition will be sent to Student Government for review. Please
            read the following carefully.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm leading-relaxed">
          <IncidentNotice className="font-semibold text-muted-foreground" />
          <p>
            Use of this site falls under the{" "}
            <a
              href="https://www.rit.edu/policies/c082"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              RIT Code of Conduct for Computer and Network Use
            </a>
            .
          </p>
          <p>
            When using this service, you agree to sign petitions from only one
            RIT Computer Account. Should you have access to more than one
            account, you will only sign from your primary student, faculty, or
            staff account.
          </p>
          <p className="font-bold">
            Please exercise good judgment when using this service.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
          <Checkbox
            id="submit-agreement"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked === true)}
            disabled={isSubmitting}
            className="mt-0.5"
          />
          <Label
            htmlFor="submit-agreement"
            className="text-sm leading-snug font-normal"
          >
            I have read and agree to the above, and confirm this petition
            follows the RIT Code of Conduct.
          </Label>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={!agreed || isSubmitting}>
            {isSubmitting ? (
              <>
                <Spinner />
                Submitting
              </>
            ) : (
              "Submit for Review"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
