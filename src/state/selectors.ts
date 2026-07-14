import { Task, TimeEntry } from "../types";
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

export function estimateRemainingMin(s: DaybirdState, now = Date.now()): number {
  return todayTasks(s, now)
    .filter((t) => t.status === "todo")
    .reduce((sum, t) => sum + Math.max(0, (t.estimateMin ?? 0) - workedMinToday(s, t.id, now)), 0);
}
