"use client";

import React from "react";
import { CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Signatures against a petition's target.
 *
 * A ratio against a limit is a meter, not a number: a column of bare counts
 * gives no sense of which petitions are close, because 12 and 120 look alike
 * at a glance while their fills do not.
 *
 * Colour rules:
 * - Below target this is a *magnitude*, so the fill is one hue (brand orange)
 *   on a lighter step of the same hue. No traffic-light ramp — more
 *   signatures is not "worse", and amber-in-the-middle would imply it.
 * - At or over target it flips to the reserved status green, and gains a
 *   check icon so the state never rests on colour alone.
 */
export function SignatureMeter({
  signatures,
  target,
  className,
}: {
  signatures: number;
  target: number;
  className?: string;
}) {
  const safeTarget = Math.max(target, 1);
  const ratio = Math.min(signatures / safeTarget, 1);
  const met = signatures >= safeTarget;

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      title={`${signatures} of ${safeTarget} signatures`}
    >
      <div className="flex flex-col items-end gap-1">
        <span
          className={cn(
            "flex items-center gap-1 text-xs tabular-nums",
            met
              ? "font-medium text-emerald-700 dark:text-emerald-500"
              : "text-muted-foreground",
          )}
        >
          {met && <CircleCheck className="h-3 w-3" aria-hidden />}
          {signatures}
          <span className="text-muted-foreground/60">/{safeTarget}</span>
        </span>

        <div
          className={cn(
            "h-1.5 w-16 overflow-hidden rounded-full",
            // Track is a lighter step of the fill's own hue, so the bar reads
            // as one object rather than a fill floating on grey.
            met ? "bg-emerald-600/15" : "bg-[#F76902]/15",
          )}
          role="progressbar"
          aria-valuenow={signatures}
          aria-valuemin={0}
          aria-valuemax={safeTarget}
          aria-label={`${signatures} of ${safeTarget} signatures`}
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width]",
              met ? "bg-emerald-600" : "bg-[#F76902]",
            )}
            style={{ width: `${Math.max(ratio * 100, signatures > 0 ? 6 : 0)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default SignatureMeter;
