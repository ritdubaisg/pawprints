import { Petition } from "@/types/petition";
import { statusFromStateKey } from "./petition-status";

/**
 * A small GitHub-style query language for the review list.
 *
 * `state:pending category:"Student Services" parking` reads as three
 * qualifiers and a free-text term. Qualifiers of the same key are OR'd
 * (`state:pending state:returned` means either), different keys are AND'd —
 * which is what people expect from the issue search they are copying the
 * habit from.
 */
export const QUALIFIER_KEYS = ["state", "category", "author"] as const;
export type QualifierKey = (typeof QUALIFIER_KEYS)[number];

export interface ParsedQuery {
  /** Everything that was not a recognised qualifier. */
  text: string;
  qualifiers: Record<QualifierKey, string[]>;
}

const EMPTY_QUALIFIERS = (): Record<QualifierKey, string[]> => ({
  state: [],
  category: [],
  author: [],
});

/**
 * Splits on whitespace but keeps `key:"two words"` together. Categories are
 * multi-word ("Dining Services / Cafeteria"), so quoting is not optional.
 */
function tokenize(raw: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quoted = false;

  for (const char of raw) {
    if (char === '"') {
      quoted = !quoted;
      current += char;
      continue;
    }
    if (!quoted && /\s/.test(char)) {
      if (current) tokens.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current) tokens.push(current);

  return tokens;
}

function unquote(value: string) {
  return value.replace(/^"(.*)"$/, "$1");
}

/** Wraps a value in quotes only when it needs them. */
export function quoteIfNeeded(value: string) {
  return /\s/.test(value) ? `"${value}"` : value;
}

export function parseSearchQuery(raw: string): ParsedQuery {
  const qualifiers = EMPTY_QUALIFIERS();
  const text: string[] = [];

  for (const token of tokenize(raw ?? "")) {
    const separator = token.indexOf(":");
    if (separator > 0) {
      const key = token.slice(0, separator).toLowerCase() as QualifierKey;
      const value = unquote(token.slice(separator + 1)).trim();
      if (QUALIFIER_KEYS.includes(key) && value) {
        qualifiers[key].push(value);
        continue;
      }
    }
    text.push(token);
  }

  return { text: text.join(" ").trim(), qualifiers };
}

/**
 * Adds or removes one qualifier, leaving the rest of the query untouched.
 * Filter menus are just shortcuts for typing, so they edit the same string
 * the user can edit by hand.
 */
export function toggleQualifier(
  raw: string,
  key: QualifierKey,
  value: string,
): string {
  const target = `${key}:${quoteIfNeeded(value)}`;
  const tokens = tokenize(raw ?? "");

  const index = tokens.findIndex((token) => {
    const separator = token.indexOf(":");
    if (separator <= 0) return false;
    return (
      token.slice(0, separator).toLowerCase() === key &&
      unquote(token.slice(separator + 1)).toLowerCase() === value.toLowerCase()
    );
  });

  if (index >= 0) {
    tokens.splice(index, 1);
  } else {
    tokens.push(target);
  }

  return tokens.join(" ").trim();
}

/** Replaces every qualifier of `key` with a single value, or clears them. */
export function setQualifier(
  raw: string,
  key: QualifierKey,
  value: string | null,
): string {
  const tokens = tokenize(raw ?? "").filter((token) => {
    const separator = token.indexOf(":");
    if (separator <= 0) return true;
    return token.slice(0, separator).toLowerCase() !== key;
  });

  if (value) tokens.push(`${key}:${quoteIfNeeded(value)}`);

  return tokens.join(" ").trim();
}

export function hasQualifier(
  parsed: ParsedQuery,
  key: QualifierKey,
  value: string,
) {
  return parsed.qualifiers[key].some(
    (entry) => entry.toLowerCase() === value.toLowerCase(),
  );
}

export function matchesQuery(petition: Petition, parsed: ParsedQuery): boolean {
  const { text, qualifiers } = parsed;

  if (text) {
    const needle = text.toLowerCase();
    const haystack = [
      petition.title,
      petition.author,
      String(petition.id),
      ...petition.tags.map((tag) => tag.name),
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  if (qualifiers.state.length > 0) {
    const allowed = qualifiers.state
      .map(statusFromStateKey)
      .filter((status): status is number => status !== null);
    // An unrecognised state key matches nothing, rather than being ignored:
    // silently returning every petition for a typo is worse than an empty list.
    if (!allowed.includes(petition.status)) return false;
  }

  if (qualifiers.category.length > 0) {
    const names = petition.tags.map((tag) => tag.name.toLowerCase());
    const wanted = qualifiers.category.map((value) => value.toLowerCase());
    if (!wanted.some((value) => names.includes(value))) return false;
  }

  if (qualifiers.author.length > 0) {
    const author = petition.author.toLowerCase();
    const email = (petition.authorEmail ?? "").toLowerCase();
    const wanted = qualifiers.author.map((value) => value.toLowerCase());
    if (!wanted.some((value) => author.includes(value) || email.includes(value)))
      return false;
  }

  return true;
}
