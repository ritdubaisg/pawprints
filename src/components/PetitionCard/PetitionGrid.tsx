"use client";

import React from "react";
import PetitionCard from "./PetitionCard";
import { Petition } from "../../types/petition";
import { rememberPetitionPreview } from "@/lib/petition-preview";
import { hasResponse, targetOf } from "@/lib/petition-sections";
import { Skeleton } from "../ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";

interface PetitionGridProps {
  petitions: Petition[];
  isLoading?: boolean;
  onPetitionClick: (petition: Petition) => void;
  columns?: 1 | 2 | 3;
  showStatus?: boolean;
}

const PetitionCardSkeleton = () => (
  <Card className="h-full flex flex-col relative overflow-hidden">
    <CardHeader className="pb-2">
      <div className="flex justify-between items-center mb-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
    </CardHeader>
    <CardContent className="flex-grow py-2">
      <Skeleton className="h-7 w-full mb-2" />
      <Skeleton className="h-7 w-2/3" />
    </CardContent>
    <CardFooter className="pb-6 pt-4">
      <Skeleton className="h-6 w-24 rounded-full" />
    </CardFooter>
    <div className="absolute bottom-0 left-0 w-full h-2 bg-muted" />
  </Card>
);

/** A PetitionCard fed from a list's Petition, shared by the grid and carousels. */
export function PetitionListCard({
  petition,
  showStatus = false,
  onClick,
}: {
  petition: Petition;
  showStatus?: boolean;
  onClick: (petition: Petition) => void;
}) {
  return (
    <PetitionCard
      id={petition.id}
      title={petition.title}
      currentSignatures={petition.signatures}
      targetSignatures={targetOf(petition)}
      category={petition.tags[0]?.name || "General"}
      status={petition.status}
      expires={petition.expires}
      showStatus={showStatus}
      hasResponse={hasResponse(petition)}
      onClick={() => {
        // What the destination can show instantly, before it has
        // fetched anything. See lib/petition-preview.ts.
        rememberPetitionPreview(petition);
        onClick(petition);
      }}
    />
  );
}

const PetitionGrid: React.FC<PetitionGridProps> = ({
  petitions,
  isLoading = false,
  onPetitionClick,
  columns = 3,
  showStatus = false,
}) => {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  }[columns];

  if (isLoading) {
    return (
      <div className="w-full">
        <div className={`grid ${gridCols} gap-6 auto-rows-fr`}>
          {[...Array(6)].map((_, i) => (
            <PetitionCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className={`grid ${gridCols} gap-6 auto-rows-fr`}>
        {petitions.map((petition) => (
          <PetitionListCard
            key={petition.id}
            petition={petition}
            showStatus={showStatus}
            onClick={onPetitionClick}
          />
        ))}
      </div>
    </div>
  );
};

export default PetitionGrid;
