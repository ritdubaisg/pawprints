/**
 * How long a description reads, not how long its HTML is. The editor stores
 * markup, so counting the raw string would let `<p><strong>` pay for a third
 * of a short description. Shared by the form and the server actions so both
 * sides agree on what "250 characters" means.
 */
export function plainTextLength(html: string): number {
  return html
    .replace(/<[^>]*>/g, "")
    // Each entity is one character on screen.
    .replace(/&(?:#\d+|#x[\da-f]+|[a-z]+);/gi, "x")
    .trim().length;
}
