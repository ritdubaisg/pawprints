import sanitizeHtml from "sanitize-html";

const INVISIBLE_TEXT_RE = /[\p{White_Space}\p{Cf}]/gu;

export function getVisibleTextLength(value: string): number {
  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
  }).replace(INVISIBLE_TEXT_RE, "").length;
}

export function assertMinimumVisibleTextLength(
  value: string,
  minimumLength: number,
  emptyMessage: string,
  minimumMessage: string,
): void {
  const visibleLength = getVisibleTextLength(value);

  if (visibleLength === 0) {
    throw new Error(emptyMessage);
  }

  if (visibleLength < minimumLength) {
    throw new Error(minimumMessage);
  }
}
