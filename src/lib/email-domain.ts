/**
 * PawPrints is restricted to the RIT community.
 *
 * Students sign in with Google and carry `@g.rit.edu` addresses; faculty and
 * staff have no Google identity, so a superadmin issues them a password
 * account against their `@rit.edu` address. Both live under rit.edu, so the
 * rule is a single root domain plus any of its subdomains.
 */
export const ALLOWED_EMAIL_ROOT_DOMAIN = "rit.edu";

/** Shown in the UI wherever a rejected address needs explaining. */
export const ALLOWED_EMAIL_DESCRIPTION = "@rit.edu or @g.rit.edu";

/** Lowercased and trimmed. Firebase treats addresses case-insensitively. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * True for `name@rit.edu` and any subdomain of it (`@g.rit.edu`,
 * `@mail.rit.edu`, ...). The suffix check is anchored on a leading dot so
 * lookalikes such as `notrit.edu` cannot slip through.
 */
export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf("@");
  if (at <= 0 || at === normalized.length - 1) return false;

  const domain = normalized.slice(at + 1);
  return (
    domain === ALLOWED_EMAIL_ROOT_DOMAIN ||
    domain.endsWith(`.${ALLOWED_EMAIL_ROOT_DOMAIN}`)
  );
}

/** Google-provisioned student accounts, as opposed to issued password ones. */
export function isGoogleWorkspaceEmail(email: string | null | undefined) {
  if (!email) return false;
  return normalizeEmail(email).endsWith("@g.rit.edu");
}
