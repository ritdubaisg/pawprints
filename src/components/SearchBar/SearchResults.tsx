import { CircleX } from "lucide-react";
import React from "react";
import { Button } from "../ui/button";
import { PETITION_PROGRESS_OPTIONS } from "@/lib/petition-sections";

interface SearchResultsProps {
  isLoading: boolean;
  resultsCount: number;
  searchTerm: string;
  selectedFilter: string;
  selectedStatus?: string;
  onClearAll?: () => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  isLoading,
  resultsCount,
  searchTerm,
  selectedFilter,
  selectedStatus = "All",
  onClearAll,
}) => {
  const hasActiveSearch =
    searchTerm.trim() !== "" ||
    selectedFilter !== "All" ||
    selectedStatus !== "All";

  if (isLoading) {
    return null;
  }

  if (!hasActiveSearch) {
    return null; // Don't show anything when no search is active
  }

  const statusLabel = PETITION_PROGRESS_OPTIONS.find(
    (option) => option.value === selectedStatus,
  )?.label;

  if (resultsCount === 0) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <div className="mx-auto h-12 w-12 text-muted-foreground/50">
            <CircleX size={48} />
          </div>
        </div>
        <p className="text-muted-foreground text-lg font-medium">
          No petitions found
        </p>
        <p className="text-muted-foreground/80 text-sm mt-2">
          Try adjusting your search term or filters
        </p>
        {onClearAll && (
          <Button variant="outline" className="mt-4" onClick={onClearAll}>
            Clear all filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1">
      <p className="text-muted-foreground text-sm">
        Found{" "}
        <span className="font-semibold text-foreground">{resultsCount}</span>{" "}
        {statusLabel && (
          <span className="font-medium text-foreground">
            {statusLabel.toLowerCase()}{" "}
          </span>
        )}
        petition{resultsCount !== 1 ? "s" : ""}
        {searchTerm && (
          <span>
            {" "}
            matching "<span className="font-medium">{searchTerm}</span>"
          </span>
        )}
        {selectedFilter !== "All" && (
          <span>
            {" "}
            in <span className="font-medium">{selectedFilter}</span>
          </span>
        )}
      </p>
      {onClearAll && (
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-sm"
          onClick={onClearAll}
        >
          Clear all
        </Button>
      )}
    </div>
  );
};

export default SearchResults;
