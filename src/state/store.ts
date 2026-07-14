import { create, StateCreator } from "zustand";
import { Project, Task, TimeEntry } from "../types";
import { seedEntries, seedProjects, seedTasks } from "../mock/seed";
import { dayKey, MIN } from "../lib/time";

export type View = "today" | "upcoming" | "projects" | "log";
export interface IdleSpan { start: number; end: number; }

export interface DaybirdState {
  projects: Project[];
  tasks: Task[];
  entries: TimeEntry[];
  activeTaskId: string | null;
  view: View;
  selectedTaskId: string | null;
  idleSpan: IdleSpan | null;
  railOpen: boolean;
  composerOpen: boolean;
  toggleDone(id: string, now?: number): void;
  dropTask(id: string, now?: number): void;
  addTask(title: string, estimateMin?: number, now?: number): void;
  addToToday(id: string, now?: number): void;
  addAllOverdueToToday(now?: number): void;
  startTimer(id: string, now?: number): void;
  stopTimer(now?: number): void;
  openIdleSheet(span: IdleSpan): void;
  resolveIdle(taskMin: number, breakMin: number, skipMin: number): void;
  setView(v: View): void;
  setSelected(id: string | null): void;
  toggleRail(): void;
  setComposer(open: boolean): void;
}

function closeOpenEntry(entries: TimeEntry[], at: number): TimeEntry[] {
  return entries.map((e) => (e.end === null ? { ...e, end: Math.max(e.start, at) } : e));
}

export const storeCreator: StateCreator<DaybirdState> = (set) => ({
  projects: seedProjects,
  tasks: seedTasks,
  entries: seedEntries,
  activeTaskId: null,
  view: "today",
  selectedTaskId: null,
  idleSpan: null,
  railOpen: true,
  composerOpen: false,

  toggleDone: (id, now = Date.now()) =>
    set((s) => {
      const target = s.tasks.find((t) => t.id === id);
      const finishing = target?.status !== "done";
      return {
        tasks: s.tasks.map((t) =>
          t.id !== id
            ? t
            : finishing
              ? { ...t, status: "done", completedAt: now }
              : { ...t, status: "todo", completedAt: undefined }
        ),
        entries: finishing && s.activeTaskId === id ? closeOpenEntry(s.entries, now) : s.entries,
        activeTaskId: finishing && s.activeTaskId === id ? null : s.activeTaskId,
      };
    }),

  dropTask: (id, now = Date.now()) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id !== id
          ? t
          : t.status === "dropped"
            ? { ...t, status: "todo", completedAt: undefined }
            : { ...t, status: "dropped", completedAt: now }
      ),
      entries: s.activeTaskId === id ? closeOpenEntry(s.entries, now) : s.entries,
      activeTaskId: s.activeTaskId === id ? null : s.activeTaskId,
    })),

  addTask: (title, estimateMin, now = Date.now()) =>
    set((s) => ({
      tasks: [
        ...s.tasks,
        {
          id: crypto.randomUUID(),
          title,
          estimateMin,
          scheduledFor: dayKey(now),
          status: "todo",
          sortOrder: Math.max(0, ...s.tasks.map((t) => t.sortOrder)) + 1,
        },
      ],
    })),

  addToToday: (id, now = Date.now()) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, scheduledFor: dayKey(now) } : t)),
    })),

  addAllOverdueToToday: (now = Date.now()) =>
    set((s) => {
      const today = dayKey(now);
      return {
        tasks: s.tasks.map((t) =>
          t.status === "todo" && t.scheduledFor && t.scheduledFor < today
            ? { ...t, scheduledFor: today }
            : t
        ),
      };
    }),

  startTimer: (id, now = Date.now()) =>
    set((s) => ({
      entries: [
        ...closeOpenEntry(s.entries, now),
        { id: crypto.randomUUID(), taskId: id, kind: "work", start: now, end: null },
      ],
      activeTaskId: id,
    })),

  stopTimer: (now = Date.now()) =>
    set((s) => ({ entries: closeOpenEntry(s.entries, now), activeTaskId: null })),

  openIdleSheet: (span) =>
    set((s) => ({ entries: closeOpenEntry(s.entries, span.start), idleSpan: span })),

  resolveIdle: (taskMin, breakMin, skipMin) =>
    set((s) => {
      if (!s.idleSpan) return {};
      const { start } = s.idleSpan;
      const mk = (kind: TimeEntry["kind"], taskId: string | null, from: number, min: number): TimeEntry => ({
        id: crypto.randomUUID(), taskId, kind, start: from, end: from + min * MIN,
      });
      const out: TimeEntry[] = [];
      let cursor = start;
      if (taskMin > 0) { out.push(mk("work", s.activeTaskId, cursor, taskMin)); cursor += taskMin * MIN; }
      if (breakMin > 0) { out.push(mk("break", null, cursor, breakMin)); cursor += breakMin * MIN; }
      if (skipMin > 0) { out.push(mk("discarded", null, cursor, skipMin)); }
      return { entries: [...s.entries, ...out], idleSpan: null };
    }),

  setView: (view) => set({ view }),
  setSelected: (selectedTaskId) => set({ selectedTaskId }),
  toggleRail: () => set((s) => ({ railOpen: !s.railOpen })),
  setComposer: (composerOpen) => set({ composerOpen }),
});

export const useDaybird = create<DaybirdState>()(storeCreator);
