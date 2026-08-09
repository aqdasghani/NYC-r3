/** Deterministic-ish date helpers for seed data. */

/** ISO date `days` from today. */
export function dateInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** ISO date `days` before today. */
export function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** ISO datetime `hours` ago (used for "2h ago" notifications). */
export function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}
