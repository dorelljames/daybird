import { create, StateCreator } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { Priority, Project, Task, TimeEntry } from "../types";
import { seedEntries, seedProjects, seedTasks } from "../mock/seed";
import { dayKey, MIN } from "../lib/time";
import { closeStaleOpenEntries } from "../lib/hydrate";

export type View = "today" | "upcoming" | "projects" | "log";
export interface IdleSpan { start: number; end: number; }
export interface Toast { message: string; }
interface UndoSnapshot {
  tasks: Task[];
  entries: TimeEntry[];
  activeTaskId: string | null;
}

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
  soundOn: boolean;
  toggleSound(): void;
  helpOpen: boolean;
  setHelp(open: boolean): void;
  toast: Toast | null;
  undoSnapshot: UndoSnapshot | null;
  toggleDone(id: string, now?: number): void;
  dropTask(id: string, now?: number): void;
  deleteTask(id: string): void;
  undoToast(): void;
  dismissToast(): void;
  reorderToday(orderedIds: string[]): void;
  setPriority(id: string, priority?: Priority): void;
  renameTask(id: string, title: string): void;
  editingId: string | null;
  setEditing(id: string | null): void;
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

function snapshot(s: DaybirdState): UndoSnapshot {
  return { tasks: s.tasks, entries: s.entries, activeTaskId: s.activeTaskId };
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
  soundOn: true,
  toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),
  helpOpen: false,
  setHelp: (helpOpen) => set({ helpOpen }),
  toast: null,
  undoSnapshot: null,

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
    set((s) => {
      const target = s.tasks.find((t) => t.id === id);
      if (!target) return {};
      const restoring = target.status === "dropped";
      return {
        tasks: s.tasks.map((t) =>
          t.id !== id
            ? t
            : restoring
              ? { ...t, status: "todo", completedAt: undefined }
              : { ...t, status: "dropped", completedAt: now }
        ),
        entries: s.activeTaskId === id ? closeOpenEntry(s.entries, now) : s.entries,
        activeTaskId: s.activeTaskId === id ? null : s.activeTaskId,
        ...(restoring ? {} : { undoSnapshot: snapshot(s), toast: { message: "Task discarded" } }),
      };
    }),

  deleteTask: (id) =>
    set((s) => ({
      undoSnapshot: snapshot(s),
      toast: { message: "Task deleted" },
      tasks: s.tasks.filter((t) => t.id !== id),
      entries: s.entries.filter((e) => e.taskId !== id),
      activeTaskId: s.activeTaskId === id ? null : s.activeTaskId,
    })),

  undoToast: () =>
    set((s) => (s.undoSnapshot ? { ...s.undoSnapshot, undoSnapshot: null, toast: null } : { toast: null })),

  dismissToast: () => set({ toast: null, undoSnapshot: null }),

  reorderToday: (orderedIds) =>
    set((s) => {
      const pos = new Map(orderedIds.map((id, i) => [id, i + 1]));
      return { tasks: s.tasks.map((t) => (pos.has(t.id) ? { ...t, sortOrder: pos.get(t.id)! } : t)) };
    }),

  renameTask: (id, title) =>
    set((s) => {
      const t = title.trim();
      if (!t) return {};
      return { tasks: s.tasks.map((x) => (x.id === id ? { ...x, title: t } : x)) };
    }),

  setPriority: (id, priority) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, priority } : t)),
    })),

  editingId: null,
  setEditing: (editingId) => set({ editingId }),

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
          sortOrder: Math.min(0, ...s.tasks.map((t) => t.sortOrder)) - 1,
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

export const useDaybird = create<DaybirdState>()(
  persist(storeCreator, {
    name: "daybird-v1",
    storage: createJSONStorage(() => localStorage),
    partialize: (s) => ({
      projects: s.projects,
      tasks: s.tasks,
      entries: s.entries,
      activeTaskId: s.activeTaskId,
      railOpen: s.railOpen,
      soundOn: s.soundOn,
    }),
  })
);

// Post-hydration safety: close timers forgotten on previous days, and clear the
// active task if its entry got closed by that guard.
useDaybird.setState((s) => {
  const entries = closeStaleOpenEntries(s.entries, Date.now());
  return {
    entries,
    activeTaskId: entries.some((e) => e.end === null) ? s.activeTaskId : null,
  };
});
