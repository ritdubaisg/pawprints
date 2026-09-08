import moment from "moment";

/**
 * Date formats for the review screens.
 *
 * Reviewers act on timing — how long a petition has been waiting, when a
 * response landed — so the exact clock time is shown alongside the relative
 * phrasing rather than hidden in a tooltip.
 */

/** e.g. "Mon, Feb 5, 2026" */
export function formatDate(value: string | Date) {
  return moment(value).format("ddd, MMM D, YYYY");
}

/** e.g. "3:42 PM" */
export function formatTime(value: string | Date) {
  return moment(value).format("h:mm A");
}

/** e.g. "Mon, Feb 5, 2026 at 3:42 PM" */
export function formatDateTime(value: string | Date) {
  return `${formatDate(value)} at ${formatTime(value)}`;
}

/** e.g. "2 days ago" */
export function formatRelative(value: string | Date) {
  return moment(value).fromNow();
}
