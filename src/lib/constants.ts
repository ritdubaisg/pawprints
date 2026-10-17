export const PETITION_THRESHOLD = 200;

export const PETITION_TIERS = [
  {
    id: 1,
    name: "Tier 1 (Quick Fix)",
    threshold: 60,
    description: "Quick Fix",
  },
  {
    id: 2,
    name: "Tier 2 (Service/Experience)",
    threshold: 120,
    description: "Service/Experience",
  },
  {
    id: 3,
    name: "Tier 3 (Major Operational)",
    threshold: 200,
    description: "Major Operational / Policy or Budget Significant",
  },
] as const;

export const PETITION_CATEGORIES = [
  "Academic Affairs",
  "Student Services",
  "Campus Life (SG, Clubs, & Organizations)",
  "Facilities & Parking",
  "Technology",
  "Housing",
  "Dining Services / Cafeteria",
  "Commuter Transportation",
  "Health & Wellness",
  "Safety & Security",
  "Accessibility & Inclusion",
  "Sustainability",
  "Financial Services",
  "Library & Learning Resources",
  "Career Services",
  "Other",
] as const;

export const PETITION_DURATION_DAYS = 180;
export const PETITION_DURATION_MS =
  PETITION_DURATION_DAYS * 24 * 60 * 60 * 1000;

/**
 * Minimum length of a petition description, counted in visible characters —
 * see `plainTextLength` in lib/petition-text.ts.
 */
export const PETITION_DESCRIPTION_MIN_LENGTH = 250;
