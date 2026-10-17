import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The home page's loading state. The page already had a <Suspense> in it,
 * but its `await getPetitions()` ran *above* the boundary, so the boundary
 * never suspended anything — the route still blocked on the fetch. A
 * loading file wraps the whole segment, which is what actually makes the
 * navigation instant.
 *
 * Mirrors the carousel rows: a title, then cards starting at the container
 * edge and running off the right of the screen.
 */
export default function HomeLoading() {
  return (
    <div className="overflow-x-clip py-24" aria-busy="true">
      <div className="container mx-auto px-6 mb-12 flex flex-col items-center justify-between gap-6 md:flex-row">
        <div className="w-full space-y-3 md:w-auto">
          <Skeleton className="h-10 w-72 max-w-full" />
          <Skeleton className="h-6 w-96 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-11 w-40 rounded-md" />
          <Skeleton className="h-11 w-32 rounded-md" />
        </div>
      </div>
      <div className="flex flex-col gap-14">
        {Array.from({ length: 3 }).map((_, row) => (
          <div key={row}>
            <div className="container mx-auto mb-6 px-6">
              <Skeleton className="h-7 w-56" />
            </div>
            <div className="container mx-auto flex gap-4 px-6">
              {Array.from({ length: 4 }).map((_, card) => (
                <div
                  key={card}
                  className="relative flex h-48 shrink-0 basis-[85%] flex-col overflow-hidden rounded-xl border bg-card p-6 sm:basis-[calc(50%-0.5rem)] lg:basis-[calc(33.333%-0.667rem)] xl:basis-[calc(25%-0.75rem)]"
                >
                  <div className="mb-4 flex justify-between">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="mb-2 h-5 w-full" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="mt-auto h-6 w-28 rounded-full" />
                  <div className="absolute bottom-0 left-0 h-2 w-full bg-muted" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
