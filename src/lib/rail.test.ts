import { describe, expect, test } from "vitest";
import { layoutRail } from "./rail";
import { TimeEntry } from "../types";
import { atToday } from "./time";

const PX = 40; // px per hour
const e = (start: number, end: number | null, kind: TimeEntry["kind"]): TimeEntry => ({
  id: String(start), taskId: kind === "work" ? "t" : null, kind, start, end,
});

describe("layoutRail", () => {
  test("positions blocks from day start and inserts gaps ≥3min", () => {
    const blocks = layoutRail(
      [e(atToday(9, 0), atToday(9, 50), "work"), e(atToday(10, 0), atToday(10, 30), "break")],
      8, PX, atToday(11, 0)
    );
    expect(blocks.map((b) => b.kind)).toEqual(["work", "gap", "break"]);
    expect(blocks[0].top).toBe(PX); // 9:00 is 1h after 8:00
    expect(blocks[0].height).toBeCloseTo((50 / 60) * PX);
    expect(blocks[1].top).toBeCloseTo(PX + (50 / 60) * PX);
    expect(blocks[1].height).toBeCloseTo((10 / 60) * PX);
  });
  test("ignores sub-3-minute gaps", () => {
    const blocks = layoutRail(
      [e(atToday(9, 0), atToday(9, 30), "work"), e(atToday(9, 32), atToday(9, 45), "break")],
      8, PX, atToday(10, 0)
    );
    expect(blocks.map((b) => b.kind)).toEqual(["work", "break"]);
  });
  test("open entry extends to now", () => {
    const blocks = layoutRail([e(atToday(9, 0), null, "work")], 8, PX, atToday(9, 30));
    expect(blocks[0].height).toBeCloseTo((30 / 60) * PX);
  });
});
