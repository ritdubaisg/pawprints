import * as React from "react";
import {
  CircleDot,
  CheckCircle2,
  CircleSlash,
  FilePen,
  Undo2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PetitionStatus } from "@/types/petition";
import { cn } from "@/lib/utils";

/**
 * One description of each petition state, shared by the public petition page,
 * the review list and the review detail page — so a status cannot be worded
 * or coloured one way in one place and differently in another.
 *
 * `key` is what `state:` accepts in the search box, so renaming one changes
 * the query language. `aliases` exist because the label and the key do not
 * always agree ("Needs Review" is filtered as `state:pending`).
 */
export interface PetitionStateMeta {
  key: string;
  aliases: string[];
  label: string;
  /** Colour for the bare state icon used in lists and on the timeline. */
  iconClassName: string;
  /** The chip, matching what the public petition page has always rendered. */
  chipClassName: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const PETITION_STATES: Record<PetitionStatus, PetitionStateMeta> = {
  [PetitionStatus.New]: {
    key: "draft",
    aliases: ["new"],
    label: "Draft",
    iconClassName: "text-muted-foreground",
    chipClassName: "bg-orange-100 text-orange-800",
    icon: FilePen,
  },
  [PetitionStatus.Published]: {
    key: "published",
    aliases: ["live", "open"],
    label: "Published",
    iconClassName: "text-emerald-600 dark:text-emerald-500",
    chipClassName: "bg-green-100 text-green-800",
    icon: CheckCircle2,
  },
  [PetitionStatus.Removed]: {
    key: "removed",
    aliases: ["rejected"],
    label: "Removed",
    iconClassName: "text-destructive",
    chipClassName: "bg-red-100 text-red-800",
    icon: CircleSlash,
  },
  [PetitionStatus.NeedsReview]: {
    key: "pending",
    aliases: ["review", "needs-review"],
    label: "Needs Review",
    iconClassName: "text-amber-600 dark:text-amber-500",
    chipClassName: "bg-yellow-100 text-yellow-800",
    icon: CircleDot,
  },
  [PetitionStatus.Returned]: {
    key: "returned",
    aliases: [],
    label: "Returned for Changes",
    iconClassName: "text-orange-600 dark:text-orange-500",
    chipClassName: "bg-red-100 text-red-800",
    icon: Undo2,
  },
};

const FALLBACK: PetitionStateMeta = PETITION_STATES[PetitionStatus.New];

export function getPetitionState(status: number): PetitionStateMeta {
  return PETITION_STATES[status as PetitionStatus] ?? FALLBACK;
}

/** Every state in triage order, for filter menus. */
export const PETITION_STATE_LIST: {
  status: PetitionStatus;
  meta: PetitionStateMeta;
}[] = [
  PetitionStatus.NeedsReview,
  PetitionStatus.Published,
  PetitionStatus.Returned,
  PetitionStatus.Removed,
  PetitionStatus.New,
].map((status) => ({ status, meta: PETITION_STATES[status] }));

export function statusFromStateKey(key: string): PetitionStatus | null {
  const needle = key.toLowerCase();
  const match = PETITION_STATE_LIST.find(
    ({ meta }) => meta.key === needle || meta.aliases.includes(needle),
  );
  return match ? match.status : null;
}

export function PetitionStateIcon({
  status,
  className,
}: {
  status: number;
  className?: string;
}) {
  const meta = getPetitionState(status);
  const Icon = meta.icon;
  return <Icon className={cn("h-4 w-4", meta.iconClassName, className)} />;
}

/**
 * The status chip. Defaults to the sizing the public petition page uses;
 * pass a className to shrink it for dense contexts like a list row.
 */
export function PetitionStatusChip({
  status,
  className,
}: {
  status: number;
  className?: string;
}) {
  const meta = getPetitionState(status);
  return (
    <Badge
      variant="outline"
      className={cn(meta.chipClassName, "text-base px-3 py-1", className)}
    >
      {meta.label}
    </Badge>
  );
}
