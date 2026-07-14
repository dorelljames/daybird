import { EntryKind, TimeEntry } from "../types";
import { MIN } from "./time";

export interface RailBlock {
  top: number;
  height: number;
  kind: EntryKind | "gap";
}

const GAP_MIN = 3;

export function layoutRail(
  entries: TimeEntry[],
  dayStartHour: number,
  pxPerHour: number,
  now: number
): RailBlock[] {
  const dayStart = new Date(now);
  dayStart.setHours(dayStartHour, 0, 0, 0);
  const origin = dayStart.getTime();
  const toPx = (ms: number) => ((ms - origin) / (60 * MIN)) * pxPerHour;

  const sorted = entries
    .filter((e) => (e.end ?? now) > origin)
    .map((e) => ({ ...e, end: e.end ?? now }))
    .sort((a, b) => a.start - b.start);

  const blocks: RailBlock[] = [];
  let prevEnd: number | null = null;
  for (const e of sorted) {
    if (prevEnd !== null && e.start - prevEnd >= GAP_MIN * MIN) {
      blocks.push({ top: toPx(prevEnd), height: toPx(e.start) - toPx(prevEnd), kind: "gap" });
    }
    blocks.push({ top: toPx(e.start), height: toPx(e.end) - toPx(e.start), kind: e.kind });
    prevEnd = e.end;
  }
  return blocks;
}
