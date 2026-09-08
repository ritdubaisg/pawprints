"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Petition } from "@/types/petition";
import { Separator } from "@/components/ui/separator";
import { PetitionStatusChip } from "@/lib/petition-status";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { PetitionTimeline } from "./PetitionTimeline";
import { ReviewActionBox } from "./ReviewActionBox";
import { PetitionMetaSidebar } from "./PetitionMetaSidebar";

interface PetitionDetailProps {
  petition: Petition;
  permissions: number;
  isSuperAdmin: boolean;
  currentUserId: string | null;
  myStageKeys: string[];
}

export function PetitionDetail({
  petition,
  permissions,
  isSuperAdmin,
  currentUserId,
  myStageKeys,
}: PetitionDetailProps) {
  const canManageReviewers =
    isSuperAdmin || hasPermission(permissions, PERMISSIONS.MANAGE_REVIEWERS);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href="/review"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to petitions
      </Link>

      <header className="mt-3">
        <h1 className="text-2xl font-bold break-words sm:text-3xl">
          {petition.title}{" "}
          <span className="font-normal text-muted-foreground">
            #{petition.id}
          </span>
        </h1>

        {/* Chip only. The byline and signature count are already on the
            timeline's opening card and in the sidebar. */}
        <div className="mt-3">
          <PetitionStatusChip status={petition.status} />
        </div>
      </header>

      <Separator className="my-5" />

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="min-w-0 flex-1">
          <PetitionTimeline petition={petition}>
            <ReviewActionBox
              petition={petition}
              permissions={permissions}
              isSuperAdmin={isSuperAdmin}
              currentUserId={currentUserId}
              myStageKeys={myStageKeys}
            />
          </PetitionTimeline>
        </div>

        <PetitionMetaSidebar
          petition={petition}
          canManageReviewers={canManageReviewers}
        />
      </div>
    </div>
  );
}

export default PetitionDetail;
