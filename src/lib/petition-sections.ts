import type { Petition } from "@/types/petition";
import { PETITION_THRESHOLD } from "./constants";

export type PetitionProgress = "open" | "threshold-met" | "responded" | "expired";

export const PETITION_PROGRESS_OPTIONS: {
  value: PetitionProgress;
  label: string;
}[] = [
  { value: "open", label: "Open" },
  { value: "threshold-met", label: "Threshold met" },
  { value: "responded", label: "Responded" },
  { value: "expired", label: "Expired" },
];

export function hasResponse(petition: Pick<Petition, "has_response" | "response">) {
  return petition.has_response || petition.response !== null;
}

export function targetOf(petition: Pick<Petition, "targetSignatures">) {
  return petition.targetSignatures || PETITION_THRESHOLD;
}

export function getPetitionProgress(
  petition: Petition,
  now: number = Date.now(),
): PetitionProgress {
  if (hasResponse(petition)) return "responded";
  if (new Date(petition.expires).getTime() < now) return "expired";
  if (petition.signatures >= targetOf(petition)) return "threshold-met";
  return "open";
}

export const SECTION_LIMIT = 10;
export const NEW_SECTION_LIMIT = 6;
export const NEARLY_THERE_RATIO = 0.6;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Inspired by the HackerNews velocity formula
// See https://news.ycombinator.com/item?id=1781013
// Hehe
const GRAVITY = 1.5;
const HALF_LIFE_HOURS = 48;
const MIN_TRENDING_SIGNATURES = 3;
const TRENDING_QUIET_CUTOFF_MS = 7 * DAY_MS;

export function trendingScore(petition: Petition, now: number = Date.now()) {
  if (petition.signatures < MIN_TRENDING_SIGNATURES) return 0;
  if (!petition.last_signed) return 0;
  if (new Date(petition.expires).getTime() < now) return 0;

  const sinceLastSigned = Math.max(
    now - new Date(petition.last_signed).getTime(),
    0,
  );
  if (sinceLastSigned > TRENDING_QUIET_CUTOFF_MS) return 0;

  const ageDays = Math.max(now - new Date(petition.created_at).getTime(), 0) / DAY_MS;
  const velocity = petition.signatures / Math.pow(ageDays + 2, GRAVITY);
  const freshness = Math.pow(0.5, sinceLastSigned / HOUR_MS / HALF_LIFE_HOURS);

  return velocity * freshness;
}

function time(iso: string) {
  return new Date(iso).getTime();
}

function latestUpdateTime(petition: Petition) {
  return petition.updates.reduce(
    (latest, update) => Math.max(latest, time(update.created_at)),
    0,
  );
}

export interface HomeSections {
  trending: Petition[];
  newest: Petition[];
  nearlyThere: Petition[];
  updated: Petition[];
  responded: Petition[];
}

export function buildHomeSections(
  petitions: Petition[],
  now: number = Date.now(),
): HomeSections {
  const live = petitions.filter((p) => time(p.expires) >= now);

  const trending = live
    .map((petition) => ({ petition, score: trendingScore(petition, now) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, SECTION_LIMIT)
    .map(({ petition }) => petition);

  const newest = [...live]
    .sort((a, b) => time(b.created_at) - time(a.created_at))
    .slice(0, NEW_SECTION_LIMIT);

  const nearlyThere = live
    .filter((p) => !hasResponse(p))
    .map((petition) => ({
      petition,
      ratio: petition.signatures / targetOf(petition),
    }))
    .filter(({ ratio }) => ratio >= NEARLY_THERE_RATIO && ratio < 1)
    .sort(
      (a, b) =>
        b.ratio - a.ratio ||
        // Same percentage: fewer signatures left to go is closer.
        targetOf(a.petition) -
          a.petition.signatures -
          (targetOf(b.petition) - b.petition.signatures),
    )
    .slice(0, SECTION_LIMIT)
    .map(({ petition }) => petition);

  const updated = petitions
    .filter((p) => p.updates.length > 0)
    .sort((a, b) => latestUpdateTime(b) - latestUpdateTime(a))
    .slice(0, SECTION_LIMIT);

  const responded = petitions
    .filter(hasResponse)
    .sort(
      (a, b) =>
        time(b.response?.created_at ?? b.created_at) -
        time(a.response?.created_at ?? a.created_at),
    )
    .slice(0, SECTION_LIMIT);

  return { trending, newest, nearlyThere, updated, responded };
}
