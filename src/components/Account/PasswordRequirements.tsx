"use client";

import React from "react";
import { Check, X } from "lucide-react";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";
import { cn } from "@/lib/utils";

/**
 * The same rules `validatePassword` enforces on the server, restated as a
 * live checklist. Kept in lockstep with lib/password.ts.
 */
const RULES: { label: string; test: (value: string) => boolean }[] = [
  {
    label: `At least ${MIN_PASSWORD_LENGTH} characters`,
    test: (v) => v.length >= MIN_PASSWORD_LENGTH,
  },
  { label: "A lowercase letter", test: (v) => /[a-z]/.test(v) },
  { label: "An uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "A number", test: (v) => /[0-9]/.test(v) },
];

export function passwordMeetsRequirements(value: string) {
  return RULES.every((rule) => rule.test(value));
}

export function PasswordRequirements({ value }: { value: string }) {
  return (
    <ul className="grid gap-1 sm:grid-cols-2" aria-live="polite">
      {RULES.map((rule) => {
        const met = rule.test(value);
        return (
          <li
            key={rule.label}
            className={cn(
              "flex items-center gap-2 text-xs",
              met ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {met ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-500" />
            ) : (
              <X className="h-3.5 w-3.5 shrink-0 opacity-50" />
            )}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
