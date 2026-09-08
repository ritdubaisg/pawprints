"use client";

import React from "react";
import { Copy, ExternalLink, Users } from "lucide-react";
import { toast } from "sonner";
import { Petition } from "@/types/petition";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PETITION_THRESHOLD, PETITION_TIERS } from "@/lib/constants";
import { formatDate, formatRelative } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { AssigneesPanel } from "./AssigneesPanel";

function Section({
  title,
  children,
  note,
}: {
  title: string;
  children: React.ReactNode;
  note?: string;
}) {
  return (
    // `first:pt-2` lines the opening heading up with the byline inside the
    // first timeline card, which sits behind its own `py-2` header strip.
    <div className="border-b py-3 first:pt-2 last:border-0">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold text-muted-foreground">{title}</h2>
        {note && (
          <span className="text-[11px] text-muted-foreground/70">{note}</span>
        )}
      </div>
      <div className="mt-1.5 text-sm">{children}</div>
    </div>
  );
}

/** Text-sized link rows, so they start on the same left edge as every other
 *  section's content — a padded Button would inset them by its own gutter. */
function LinkRow({
  icon: Icon,
  children,
  href,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const className =
    "flex w-full items-center gap-2 py-1 text-left text-sm text-muted-foreground transition-colors hover:text-foreground";

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {children}
    </button>
  );
}

export function PetitionMetaSidebar({
  petition,
  canManageReviewers = false,
}: {
  petition: Petition;
  canManageReviewers?: boolean;
}) {
  const threshold = petition.targetSignatures || PETITION_THRESHOLD;
  const progress = Math.min((petition.signatures / threshold) * 100, 100);
  const tier = PETITION_TIERS.find((entry) => entry.id === petition.tier);
  const expired = new Date(petition.expires) < new Date();

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/petitions/${petition.id}`,
      );
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy — copy it from the address bar instead.");
    }
  };

  return (
    <aside className="w-full lg:w-72 lg:shrink-0">
      <Section title="Assignees">
        <AssigneesPanel
          petitionId={petition.id}
          assignments={petition.assignments ?? []}
          reviews={petition.reviews ?? []}
          canManage={canManageReviewers}
        />
      </Section>

      <Section title="Category">
        {petition.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {petition.tags.map((tag) => (
              <Badge key={tag.id} variant="secondary" className="rounded-full">
                {tag.name}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">
            None — set it when approving
          </span>
        )}
      </Section>

      <Section title="Tier">
        {tier ? (
          <div>
            <div>{tier.description}</div>
            <div className="text-xs text-muted-foreground">
              Tier {tier.id} · {tier.threshold} signatures
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">Not set</span>
        )}
      </Section>

      <Section title="Signatures">
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="tabular-nums">
            {petition.signatures} of {threshold}
          </span>
        </div>
        <Progress
          value={progress}
          className={cn(
            "mt-2 h-1.5",
            progress >= 100 && "[&>div]:bg-emerald-500",
          )}
        />
        {petition.last_signed && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Last signed {formatRelative(petition.last_signed)}
          </p>
        )}
      </Section>

      <Section title="Author">
        <div>{petition.author}</div>
        {petition.authorEmail && (
          <a
            href={`mailto:${petition.authorEmail}`}
            className="text-xs text-muted-foreground break-all hover:underline"
          >
            {petition.authorEmail}
          </a>
        )}
      </Section>

      <Section title="Dates">
        <dl className="space-y-1 text-xs">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Created</dt>
            <dd>{formatDate(petition.created_at)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">
              {expired ? "Expired" : "Expires"}
            </dt>
            <dd className={cn(expired && "text-destructive")}>
              {formatDate(petition.expires)}
            </dd>
          </div>
        </dl>
      </Section>

      <Section title="Links">
        <div className="flex flex-col">
          <LinkRow icon={ExternalLink} href={`/petitions/${petition.id}`}>
            View public page
          </LinkRow>
          <LinkRow icon={Copy} onClick={copyLink}>
            Copy link
          </LinkRow>
        </div>
      </Section>
    </aside>
  );
}

export default PetitionMetaSidebar;
