import { describe, expect, test } from "vitest";
import { fmtClock, fmtMin, dayKey, minutesBetween, MIN } from "./time";

describe("time helpers", () => {
  test("fmtClock formats mm:ss", () => {
    expect(fmtClock(0)).toBe("0:00");
    expect(fmtClock(61)).toBe("1:01");
    expect(fmtClock(761)).toBe("12:41");
  });
  test("fmtMin formats human durations", () => {
    expect(fmtMin(55)).toBe("55m");
    expect(fmtMin(60)).toBe("1h");
    expect(fmtMin(85)).toBe("1h 25m");
  });
  test("dayKey is local YYYY-MM-DD", () => {
    const t = new Date(2026, 6, 14, 9, 30).getTime();
    expect(dayKey(t)).toBe("2026-07-14");
  });
  test("minutesBetween rounds to nearest minute", () => {
    const a = new Date(2026, 6, 14, 9, 0).getTime();
    expect(minutesBetween(a, a + 23 * MIN)).toBe(23);
    expect(minutesBetween(a, a + 90_000)).toBe(2);
  });
});
