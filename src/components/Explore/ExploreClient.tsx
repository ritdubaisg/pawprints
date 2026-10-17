"use client";

import React, { useState, useMemo, useEffect } from "react";
import { SearchBar, PetitionGrid, SearchResults } from "@/components";
import { ALL } from "@/components/SearchBar/SearchBar";
import { useDebounce } from "@/hooks/use-debounce";
import { getPetitionProgress } from "@/lib/petition-sections";
import { Petition } from "@/types/petition";
import { useRouter } from "next/navigation";

interface ExploreClientProps {
  initialPetitions: Petition[];
}

export default function ExploreClient({
  initialPetitions,
}: ExploreClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState(ALL);
  const [selectedStatus, setSelectedStatus] = useState(ALL);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [petitions] = useState<Petition[]>(initialPetitions);

  const router = useRouter();

  const handlePetitionClick = (petition: Petition) => {
    router.push(`/petitions/${petition.id}`);
  };

  const debouncedSearchTerm = useDebounce(searchTerm, 1000);

  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm) {
      setIsSearchLoading(true);
    } else {
      setIsSearchLoading(false);
    }
  }, [searchTerm, debouncedSearchTerm]);

  const clearAll = () => {
    setSearchTerm("");
    setSelectedFilter(ALL);
    setSelectedStatus(ALL);
  };

  const filteredPetitions = useMemo(() => {
    if (
      debouncedSearchTerm === "" &&
      selectedFilter === ALL &&
      selectedStatus === ALL
    ) {
      return petitions;
    }

    const now = Date.now();
    return petitions.filter((petition) => {
      const matchesSearch =
        debouncedSearchTerm === "" ||
        petition.title
          .toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase());

      const matchesFilter =
        selectedFilter === ALL ||
        petition.tags.some((tag) => tag.name === selectedFilter);

      const matchesStatus =
        selectedStatus === ALL ||
        getPetitionProgress(petition, now) === selectedStatus;

      return matchesSearch && matchesFilter && matchesStatus;
    });
  }, [petitions, debouncedSearchTerm, selectedFilter, selectedStatus]);

  return (
    <div className="w-full flex flex-col px-4 sm:px-8 lg:px-20 py-10 bg-background text-foreground">
      <SearchBar
        searchTerm={searchTerm}
        selectedFilter={selectedFilter}
        selectedStatus={selectedStatus}
        onSearchChange={setSearchTerm}
        onFilterChange={setSelectedFilter}
        onStatusChange={setSelectedStatus}
        onClearAll={clearAll}
      />
      <div className="flex flex-col mt-8 w-full">
        <SearchResults
          isLoading={isSearchLoading}
          resultsCount={filteredPetitions.length}
          searchTerm={debouncedSearchTerm}
          selectedFilter={selectedFilter}
          selectedStatus={selectedStatus}
          onClearAll={clearAll}
        />
        <PetitionGrid
          petitions={filteredPetitions}
          isLoading={isSearchLoading}
          onPetitionClick={handlePetitionClick}
        />
      </div>
    </div>
  );
}
