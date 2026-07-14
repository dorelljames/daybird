import { TimeEntry } from "../types";
import { dayKey } from "./time";

// A timer left running from a previous day would bleed its hours into today's
// totals; close it at 23:59 of its own day instead.
export function closeStaleOpenEntries(entries: TimeEntry[], now: number): TimeEntry[] {
  const today = dayKey(now);
  return entries.map((e) => {
    if (e.end !== null || dayKey(e.start) === today) return e;
    const d = new Date(e.start);
    d.setHours(23, 59, 0, 0);
    return { ...e, end: d.getTime() };
  });
}
