/** Monthly AI generation quota. Shared by the generate route (which enforces
 *  it) and /api/me (which reports it to the AI bar, status bar and dashboard). */
export const FREE_MONTHLY = 5;
export const PRO_MONTHLY = 100;

/** The quota bucket key: the current UTC month, e.g. "2026-07". */
export function currentMonth(now = new Date()): string {
  return now.toISOString().slice(0, 7);
}

/** When the current bucket rolls over: 00:00 UTC on the 1st of next month. */
export function quotaResetsAt(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

export interface AiUsage {
  used: number;
  limit: number;
  /** ISO timestamp. */
  resetsAt: string;
}
