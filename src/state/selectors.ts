import { EntryKind, Task, TimeEntry } from "../types";
import { dayKey, minutesBetween } from "../lib/time";
import { DaybirdState } from "./store";

const bySort = (a: Task, b: Task) => a.sortOrder - b.sortOrder;

export function todayTasks(s: DaybirdState, now = Date.now()): Task[] {
  const k = dayKey(now);
  return s.tasks.filter((t) => t.scheduledFor === k).sort(bySort);
}

export function overdueTasks(s: DaybirdState, now = Date.now()): Task[] {
  const k = dayKey(now);
  return s.tasks
    .filter((t) => t.status === "todo" && t.scheduledFor !== undefined && t.scheduledFor < k)
    .sort(bySort);
}

export function openEntry(s: DaybirdState): TimeEntry | undefined {
  return s.entries.find((e) => e.end === null);
}

export function workedMinToday(s: DaybirdState, taskId: string, now = Date.now()): number {
  const k = dayKey(now);
  return s.entries
    .filter((e) => e.taskId === taskId && e.kind === "work" && dayKey(e.start) === k)
    .reduce((sum, e) => sum + minutesBetween(e.start, e.end ?? now), 0);
}

export interface DayLog {
  day: string; // local YYYY-MM-DD
  entries: TimeEntry[];
  finished: Task[];
  dropped: Task[];
  workMin: number;
  breakMin: number;
  estMin: number; // estimates of finished tasks that carried one
  actMin: number; // total actually worked on those tasks
}

// The day journal: every day that has tracked time or a finished/dropped task,
// newest first. Today's open entry counts up to `now`.
export function dayLogs(s: DaybirdState, now = Date.now()): DayLog[] {
  const today = dayKey(now);
  const days = new Set<string>();
  for (const e of s.entries) {
    if (e.end !== null || dayKey(e.start) === today) days.add(dayKey(e.start));
  }
  for (const t of s.tasks) {
    if (t.completedAt !== undefined) days.add(dayKey(t.completedAt));
  }
  const workedTotal = (taskId: string) =>
    s.entries
      .filter((e) => e.taskId === taskId && e.kind === "work")
      .reduce((sum, e) => sum + minutesBetween(e.start, e.end ?? now), 0);

  return [...days]
    .sort()
    .reverse()
    .map((day) => {
      const entries = s.entries
        .filter((e) => dayKey(e.start) === day && (e.end !== null || day === today))
        .sort((a, b) => a.start - b.start);
      const sumKind = (k: EntryKind) =>
        entries.filter((e) => e.kind === k).reduce((x, e) => x + minutesBetween(e.start, e.end ?? now), 0);
      const finished = s.tasks.filter((t) => t.status === "done" && t.completedAt !== undefined && dayKey(t.completedAt) === day);
      const dropped = s.tasks.filter((t) => t.status === "dropped" && t.completedAt !== undefined && dayKey(t.completedAt) === day);
      const withEst = finished.filter((t) => t.estimateMin !== undefined);
      return {
        day,
        entries,
        finished,
        dropped,
        workMin: sumKind("work"),
        breakMin: sumKind("break"),
        estMin: withEst.reduce((x, t) => x + (t.estimateMin ?? 0), 0),
        actMin: withEst.reduce((x, t) => x + workedTotal(t.id), 0),
      };
    });
}

export function estimateRemainingMin(s: DaybirdState, now = Date.now()): number {
  return todayTasks(s, now)
    .filter((t) => t.status === "todo")
    .reduce((sum, t) => sum + Math.max(0, (t.estimateMin ?? 0) - workedMinToday(s, t.id, now)), 0);
}
