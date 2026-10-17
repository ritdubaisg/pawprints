"use client";
import React from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "../ui/input-group";
import { SearchIcon, X } from "lucide-react";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { PETITION_CATEGORIES } from "@/lib/constants";
import { PETITION_PROGRESS_OPTIONS } from "@/lib/petition-sections";

export const ALL = "All";

interface SearchBarProps {
  searchTerm: string;
  selectedFilter: string;
  selectedStatus: string;
  onSearchChange: (searchTerm: string) => void;
  onFilterChange: (filter: string) => void;
  onStatusChange: (status: string) => void;
  onClearAll: () => void;
}

/**
 * Fully controlled: the parent owns every value, so "clear" from anywhere on
 * the page actually clears what is shown here.
 */
const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  selectedFilter,
  selectedStatus,
  onSearchChange,
  onFilterChange,
  onStatusChange,
  onClearAll,
}) => {
  const hasActiveFilters =
    searchTerm !== "" || selectedFilter !== ALL || selectedStatus !== ALL;

  return (
    <div className="flex w-full flex-col gap-2 lg:flex-row">
      <InputGroup className="lg:flex-1">
        <InputGroupInput
          type="text"
          placeholder="Search petitions"
          value={searchTerm}
          onChange={(e: { target: { value: string } }) =>
            onSearchChange(e.target.value)
          }
        />
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        {searchTerm !== "" && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-xs"
              aria-label="Clear search"
              onClick={() => onSearchChange("")}
            >
              <X />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={selectedFilter} onValueChange={onFilterChange}>
          <SelectTrigger className="w-full sm:flex-1 lg:w-56">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {PETITION_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full sm:flex-1 lg:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {PETITION_PROGRESS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" onClick={onClearAll} className="gap-1">
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
