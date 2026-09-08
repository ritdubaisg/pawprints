import { randomInt } from "crypto";

export const MIN_PASSWORD_LENGTH = 10;

/**
 * Alphabets for generated passwords. `1`/`l`/`I` and `0`/`O` are left out:
 * issued passwords get read off a screen or a printout and typed by hand, and
 * a misread character is indistinguishable from a wrong password.
 */
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%*?";
const ALL = LOWER + UPPER + DIGITS + SYMBOLS;

function pick(alphabet: string) {
  return alphabet[randomInt(alphabet.length)];
}

/**
 * A temporary password for a newly issued or reset account. Guarantees one
 * character from each class so it always satisfies `validatePassword`, then
 * shuffles so the class order is not predictable.
 */
export function generateTempPassword(length = 14): string {
  const size = Math.max(length, MIN_PASSWORD_LENGTH);

  const chars = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < size) {
    chars.push(pick(ALL));
  }

  // Fisher-Yates with a CSPRNG.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

/**
 * Shared by the server actions and the client forms so the rules cannot
 * disagree. Returns null when the password is acceptable.
 */
export function validatePassword(password: string): string | null {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > 128) {
    return "Password must be 128 characters or fewer.";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must include a lowercase letter.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include an uppercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include a number.";
  }
  return null;
}
