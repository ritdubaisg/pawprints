"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Petition } from "@/types/petition";
import { PetitionListCard } from "@/components/PetitionCard/PetitionGrid";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

interface PetitionCarouselSectionProps {
  title: string;
  petitions: Petition[];
  onPetitionClick: (petition: Petition) => void;
}

/**
 * --edge is where the page container's content starts at each breakpoint
 * (Tailwind's container max-widths plus its px-6), with 100% being the full
 * page width. The track is padded by it so the first card lines up with the
 * title, while cards scrolling past run to the edge of the screen. The 1rem
 * taken off the left is the gutter each CarouselItem already carries.
 *
 * Padding alone only covers the start: Embla snaps every other card flush to
 * the viewport edge. `align` puts those snaps at the same offset, so the
 * gutter holds wherever the row is scrolled to.
 */
const EDGE =
  "[--edge:1.5rem] " +
  "sm:[--edge:calc((100%_-_40rem)/2_+_1.5rem)] " +
  "md:[--edge:calc((100%_-_48rem)/2_+_1.5rem)] " +
  "lg:[--edge:calc((100%_-_64rem)/2_+_1.5rem)] " +
  "xl:[--edge:calc((100%_-_80rem)/2_+_1.5rem)] " +
  "2xl:[--edge:calc((100%_-_96rem)/2_+_1.5rem)]";

/**
 * Embla can only loop when the slides more than fill the viewport, and the
 * viewport here is the whole page width. A few cards at a quarter of the
 * container each fall short on a wide screen, so short rows are repeated
 * until there are enough to wrap — the same trick Netflix plays.
 */
const MIN_LOOP_SLIDES = 12;

/**
 * One titled row of petitions on the home page, Netflix style: it wraps
 * around endlessly, the arrows turn a whole page of cards at a time, and the
 * dashes beside the title light up for whichever petitions are on screen.
 * The back arrow stays hidden until the row has moved, because until then
 * there is nothing "back" to go to. Arrows are desktop-only; on touch screens
 * the next card peeks in from the edge to say "swipe" instead.
 */
export default function PetitionCarouselSection({
  title,
  petitions,
  onPetitionClick,
}: PetitionCarouselSectionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [inView, setInView] = useState<Set<number>>(new Set([0]));
  const [hasMoved, setHasMoved] = useState(false);

  const count = petitions.length;
  const loop = count > 1;
  const copies = loop ? Math.ceil(MIN_LOOP_SLIDES / count) : 1;

  const opts = useMemo(
    () => ({
      loop,
      // A card counts as "on screen" for the indicator once it is mostly in
      // view, so the sliver peeking in at the edge does not light a dash.
      inViewThreshold: 0.9,
      // Embla re-reads `align` whenever it re-measures, including on resize.
      align: () => {
        const track = rootRef.current?.querySelector<HTMLElement>(
          '[data-slot="carousel-content"] > div',
        );
        return track
          ? parseFloat(getComputedStyle(track).paddingLeft) || 0
          : 0;
      },
    }),
    [loop],
  );

  useEffect(() => {
    if (!api || count === 0) return;

    const sync = () => {
      const visible = api.slidesInView();
      // Copies of a petition share its dash.
      setInView(
        new Set(
          visible.length > 0
            ? visible.map((index) => index % count)
            : [api.selectedScrollSnap() % count],
        ),
      );
    };
    const markMoved = () => setHasMoved(true);

    sync();
    api.on("slidesInView", sync).on("select", sync).on("reInit", sync);
    api.on("pointerDown", markMoved).on("select", markMoved);
    return () => {
      api.off("slidesInView", sync).off("select", sync).off("reInit", sync);
      api.off("pointerDown", markMoved).off("select", markMoved);
    };
  }, [api, count]);

  // Turn a full page, like Netflix, rather than nudging one card along.
  const page = useCallback(
    (direction: 1 | -1) => {
      if (!api) return;
      const perPage = Math.max(api.slidesInView().length, 1);
      const total = api.scrollSnapList().length;
      const target =
        (api.selectedScrollSnap() + direction * perPage + total) % total;
      api.scrollTo(target);
    },
    [api],
  );

  if (count === 0) return null;

  const headingId = `section-${title.toLowerCase().replace(/\W+/g, "-")}`;
  const slides = Array.from({ length: copies }, (_, copy) =>
    petitions.map((petition) => ({ petition, copy })),
  ).flat();

  return (
    <section aria-labelledby={headingId}>
      <Carousel ref={rootRef} opts={opts} setApi={setApi} className={EDGE}>
        <div className="container mx-auto mb-4 flex items-center justify-between gap-4 px-6">
          <h2 id={headingId} className="min-w-0 text-xl sm:text-2xl font-bold tracking-tight">
            {title}
          </h2>
          {loop && (
            <div className="flex shrink-0 items-center gap-3">
              <div className="flex items-center gap-1" aria-hidden>
                {petitions.map((petition, index) => (
                  <span
                    key={petition.id}
                    className={cn(
                      "h-1 w-2 rounded-full sm:w-3 transition-colors duration-300",
                      inView.has(index)
                        ? "bg-primary"
                        : "bg-muted-foreground/25",
                    )}
                  />
                ))}
              </div>
              <div className="hidden gap-2 sm:flex">
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    "size-8 rounded-full transition-opacity",
                    !hasMoved && "pointer-events-none opacity-0",
                  )}
                  onClick={() => page(-1)}
                  tabIndex={hasMoved ? 0 : -1}
                >
                  <ArrowLeft />
                  <span className="sr-only">Previous petitions</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 rounded-full"
                  onClick={() => page(1)}
                >
                  <ArrowRight />
                  <span className="sr-only">Next petitions</span>
                </Button>
              </div>
            </div>
          )}
        </div>
        <CarouselContent className="ml-0 py-2 pl-[calc(var(--edge)_-_1rem)] pr-(--edge)">
          {slides.map(({ petition, copy }) => (
            <CarouselItem
              key={`${copy}-${petition.id}`}
              // Repeats exist only to make the loop seamless; screen readers
              // get each petition once.
              aria-hidden={copy > 0 || undefined}
              className="basis-[85%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
            >
              <PetitionListCard petition={petition} onClick={onPetitionClick} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}
