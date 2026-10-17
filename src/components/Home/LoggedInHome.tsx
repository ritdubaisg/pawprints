"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/app/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Petition } from "@/types/petition";
import { useRouter } from "next/navigation";
import { PlusCircle, Search, ClipboardCheck } from "lucide-react";
import { checkAdminAccess } from "@/app/actions";
import { useVisitedPetitions } from "@/hooks/use-visited-petitions";
import type { HomeSections } from "@/lib/petition-sections";
import PetitionCarouselSection from "./PetitionCarouselSection";

interface LoggedInHomeProps {
  sections: HomeSections;
}

export default function LoggedInHome({ sections }: LoggedInHomeProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const { visitedIds } = useVisitedPetitions();

  const handlePetitionClick = (petition: Petition) => {
    router.push(`/petitions/${petition.id}`);
  };

  useEffect(() => {
    checkAdminAccess().then(setIsAdmin).catch(console.error);
  }, []);

  // Trending is ranked on the server; here we only lift what this person has
  // not opened yet to the front, keeping the ranking within each group.
  const trending = useMemo(() => {
    const unvisited = sections.trending.filter((p) => !visitedIds.has(p.id));
    const visited = sections.trending.filter((p) => visitedIds.has(p.id));
    return [...unvisited, ...visited];
  }, [sections.trending, visitedIds]);

  const rows = [
    {
      title: "Trending on campus",
      petitions: trending,
    },
    {
      title: "Recent",
      petitions: sections.newest,
    },
    {
      title: "Almost there",
      petitions: sections.nearlyThere,
    },
    {
      title: "Recently updated",
      petitions: sections.updated,
    },
    {
      title: "Responded",
      petitions: sections.responded,
    },
  ].filter((row) => row.petitions.length > 0);

  return (
    // Not a container itself: the carousels run edge to edge, and only the
    // header and each row's title line up with the page container.
    <div className="overflow-x-clip py-24">
      <div
        className="absolute left-0 right-0 h-48 pointer-events-none"
        style={{
          top: "var(--header-height, 64px)",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23f76902' fill-opacity='0.4'%3E%3Cpath d='M0 38.59l2.83-2.83 1.41 1.41L1.41 40H0v-1.41zM0 1.4l2.83 2.83 1.41-1.41L1.41 0H0v1.41zM38.59 40l-2.83-2.83 1.41-1.41L40 38.59V40h-1.41zM40 1.41l-2.83 2.83-1.41-1.41L38.59 0H40v1.41zM20 18.6l2.83-2.83 1.41 1.41L21.41 20l2.83 2.83-1.41 1.41L20 21.41l-2.83 2.83-1.41-1.41L18.59 20l-2.83-2.83 1.41-1.41L20 18.59z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          maskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 0%, transparent 100%)",
        }}
      />

      <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center mb-12 gap-6 relative">
        <div>
          <h1 className="text-4xl font-bold text-primary mb-2">
            Welcome back, {user?.displayName || "tiger"}!
          </h1>
          <p className="text-xl text-muted-foreground">
            View the most popular petitions or start a new one today.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link href="/create">
            <Button size="lg" className="gap-2">
              <PlusCircle className="h-5 w-5" />
              Create Petition
            </Button>
          </Link>
          <Link href="/explore">
            <Button variant="outline" size="lg" className="gap-2">
              <Search className="h-5 w-5" />
              Explore All
            </Button>
          </Link>
          {isAdmin && (
            <Link href="/review">
              <Button variant="outline" size="lg" className="gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Review Queue
              </Button>
            </Link>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="container mx-auto px-6">
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <p className="text-muted-foreground text-lg">
              No petitions at the moment. Why not start one?
            </p>
          </div>
        </div>
      ) : (
        <div className="relative flex flex-col gap-14">
          {rows.map((row) => (
            <PetitionCarouselSection
              key={row.title}
              {...row}
              onPetitionClick={handlePetitionClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
