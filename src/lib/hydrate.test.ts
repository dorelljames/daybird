import { describe, expect, test } from "vitest";
import { closeStaleOpenEntries } from "./hydrate";
import { atToday, dayKey, MIN } from "./time";
import { TimeEntry } from "../types";

const open = (start: number): TimeEntry => ({ id: "x", taskId: "t", kind: "work", start, end: null });

describe("closeStaleOpenEntries", () => {
  test("closes a forgotten open entry from a previous day at that day's end", () => {
    const yesterdayAfternoon = atToday(15, 0) - 24 * 60 * MIN;
    const out = closeStaleOpenEntries([open(yesterdayAfternoon)], atToday(9, 0));
    expect(out[0].end).not.toBeNull();
    expect(dayKey(out[0].end!)).toBe(dayKey(yesterdayAfternoon));
  });
  test("leaves today's running entry open", () => {
    const out = closeStaleOpenEntries([open(atToday(8, 0))], atToday(9, 0));
    expect(out[0].end).toBeNull();
  });
});
