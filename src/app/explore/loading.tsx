import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PetitionGridSkeleton } from "@/components/PetitionCard/PetitionGridSkeleton";

export default function ExploreLoading() {
  return (
    <div
      className="flex w-full flex-col bg-background px-4 py-10 text-foreground sm:px-8 lg:px-20"
      aria-busy="true"
    >
      <Skeleton className="h-10 w-56" />
      <Skeleton className="mt-2 h-5 w-80 max-w-full" />
      <div className="mt-8 flex w-full flex-col gap-4">
        <div className="flex flex-col gap-2 lg:flex-row">
          <Skeleton className="h-9 w-full rounded-md lg:flex-1" />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Skeleton className="h-9 w-full rounded-md sm:flex-1 lg:w-56" />
            <Skeleton className="h-9 w-full rounded-md sm:flex-1 lg:w-44" />
          </div>
        </div>
        <PetitionGridSkeleton count={9} className="mt-4" />
      </div>
    </div>
  );
}
