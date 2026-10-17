import React from "react";
import { useVisitedPetitions } from "@/hooks/use-visited-petitions";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { CategoryBadge } from "@/lib/category-colors";
import { PetitionStatus } from "../../types/petition";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PetitionCardProps {
  id?: number;
  title: string;
  currentSignatures: number;
  targetSignatures: number;
  category: string;
  status?: number;
  expires?: string;
  showStatus?: boolean;
  hasResponse?: boolean;
  onClick?: () => void;
}

const PetitionCard: React.FC<PetitionCardProps> = ({
  id,
  title,
  currentSignatures,
  targetSignatures,
  category,
  status,
  expires,
  showStatus = false,
  hasResponse = false,
  onClick,
}) => {
  const { isVisited } = useVisitedPetitions();
  const visited = id ? isVisited(id) : false;
  const isExpired = expires ? new Date(expires) < new Date() : false;

  let progressPercentage = Math.min(
    (currentSignatures / targetSignatures) * 100,
    100,
  );

  if (currentSignatures > 0 && progressPercentage < 5) {
    progressPercentage = 5;
  }
  const remainingSignatures = Math.max(targetSignatures - currentSignatures, 0);
  const thresholdMet = currentSignatures >= targetSignatures;

  // A response is the end goal of a petition, so it outranks the threshold:
  // a responded card is green whether or not it ever reached its target.
  const milestone = hasResponse ? "responded" : thresholdMet ? "met" : null;

  const getStatusConfig = (s?: number) => {
    if (s === undefined) return null;
    switch (s) {
      case PetitionStatus.New:
        return {
          label: "Draft",
          color: "bg-gray-100 text-gray-800 border-gray-200",
        };
      case PetitionStatus.Published:
        return {
          label: "Published",
          color: "bg-green-100 text-green-800 border-green-200",
        };
      case PetitionStatus.Removed:
        return {
          label: "Removed",
          color: "bg-red-100 text-red-800 border-red-200",
        };
      case PetitionStatus.NeedsReview:
        return {
          label: "Under Review",
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        };
      case PetitionStatus.Returned:
        return {
          label: "Returned for Changes",
          color: "bg-orange-100 text-red-800 border-red-200",
        };
      default:
        return {
          label: "Unknown",
          color: "bg-gray-100 text-gray-800 border-gray-200",
        };
    }
  };

  const statusConfig = showStatus ? getStatusConfig(status) : null;

  return (
    <Card
      className={`h-full flex flex-col hover:shadow-lg transition-all duration-300 cursor-pointer relative overflow-hidden isolate ${
        isExpired
          ? "bg-gray-200/50 dark:bg-gray-800/50 opacity-75 grayscale"
          : visited
            ? "bg-muted/30"
            : ""
      }`}
      onClick={onClick}
    >
      {milestone && (
        // `isolate` on the card lets this sit behind the content without
        // dropping behind the card's own background.
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 -z-10 h-28 bg-linear-to-b to-transparent",
            milestone === "responded"
              ? "from-emerald-500/20 dark:from-emerald-400/15"
              : "from-orange-500/20 dark:from-orange-400/15",
          )}
        />
      )}
      <CardHeader className="font-mono uppercase pb-2">
        {statusConfig && (
          <div className="mb-2">
            <Badge
              variant="outline"
              className={`font-normal ${statusConfig.color}`}
            >
              {statusConfig.label}
            </Badge>
          </div>
        )}
        <div className="flex justify-between items-center text-sm text-muted-foreground mb-1">
          <span>{currentSignatures} Signatures</span>
          {milestone === "responded" ? (
            <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Responded
            </span>
          ) : milestone === "met" ? (
            <span className="font-semibold text-orange-700 dark:text-orange-400">
              Threshold Met
            </span>
          ) : (
            <span className="font-medium text-foreground">
              Needs {remainingSignatures} More
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-grow py-2">
        <CardTitle className="text-lg leading-tight">{title}</CardTitle>
      </CardContent>

      <CardFooter className="flex flex-col items-start gap-4 pb-6">
        <CategoryBadge name={category} className="px-3 py-1 text-sm" />
      </CardFooter>
      <div className="absolute bottom-0 left-0 w-full h-2 bg-muted">
        <div
          className={cn(
            "h-full transition-all duration-300",
            milestone === "responded" ? "bg-emerald-500" : "bg-orange-500",
          )}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </Card>
  );
};

export default PetitionCard;
