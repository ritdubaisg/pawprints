"use client";

import React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PetitionSearchProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * The raw query string, editable by hand. The filter menus above the list
 * write into this same box, so whatever a menu does can also be typed — and
 * whatever is typed can be seen and corrected.
 */
export function PetitionSearch({ value, onChange }: PetitionSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder='state:pending category:"Facilities & Parking"'
        aria-label="Search petitions"
        spellCheck={false}
        className={cn(
          "h-11 pl-9 font-mono text-sm",
          value ? "pr-10" : "pr-3",
        )}
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export default PetitionSearch;
