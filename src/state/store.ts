import { create, StateCreator } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { Priority, Project, Task, TaskEvent, TaskEventType, TimeEntry } from "../types";
import { seedEntries, seedProjects, seedTasks } from "../mock/seed";
import { dayKey, MIN } from "../lib/time";
import { closeStaleOpenEntries } from "../lib/hydrate";

export type View = "today" | "upcoming" | "projects" | "log";
export interface IdleSpan { start: number; end: number; }
export interface IdleAllocation {
  kind: "task" | "break" | "skip";
  taskId?: string; // existing task target
  newTitle?: string; // create-and-assign
  min: number;
}
export interface Toast { message: string; }
interface UndoSnapshot {
  tasks: Task[];
  entries: TimeEntry[];
  events: TaskEvent[];
  activeTaskId: string | null;
}

export interface DaybirdState {
  projects: Project[];
  tasks: Task[];
  entries: TimeEntry[];
  events: TaskEvent[]; // append-only lifecycle audit trail
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
  dismissedUpdate: string | null;
  dismissUpdate(version: string): void;
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
  setEstimate(id: string, estimateMin: number | undefined): void;
  editingId: string | null;
  setEditing(id: string | null): void;
  addTask(title: string, estimateMin?: number, now?: number): void;
  addToToday(id: string, now?: number): void;
  addAllOverdueToToday(now?: number): void;
  startTimer(id: string, now?: number): void;
  stopTimer(now?: number): void;
  openIdleSheet(span: IdleSpan): void;
  dismissIdleSheet(): void;
  resolveIdle(taskMin: number, breakMin: number, skipMin: number): void;
  resolveIdleSegments(allocs: IdleAllocation[]): void;
  setView(v: View): void;
  setSelected(id: string | null): void;
  toggleRail(): void;
  setComposer(open: boolean): void;
}

function closeOpenEntry(entries: TimeEntry[], at: number): TimeEntry[] {
  return entries.map((e) => (e.end === null ? { ...e, end: Math.max(e.start, at) } : e));
}

function snapshot(s: DaybirdState): UndoSnapshot {
  return { tasks: s.tasks, entries: s.entries, events: s.events, activeTaskId: s.activeTaskId };
}

function ev(taskId: string, type: TaskEventType, at: number, meta?: string): TaskEvent {
  return { id: crypto.randomUUID(), taskId, type, at, meta };
}

export const storeCreator: StateCreator<DaybirdState> = (set, get) => ({
  projects: seedProjects,
  tasks: seedTasks,
  entries: seedEntries,
  events: [],
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
  dismissedUpdate: null,
  dismissUpdate: (dismissedUpdate) => set({ dismissedUpdate }),
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
        events: [...s.events, ev(id, finishing ? "completed" : "restored", now)],
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
        events: [...s.events, ev(id, restoring ? "restored" : "dropped", now)],
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
      events: [...s.events, ev(id, "deleted", Date.now(), s.tasks.find((t) => t.id === id)?.title)],
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
      if (!t || s.tasks.find((x) => x.id === id)?.title === t) return {};
      return {
        tasks: s.tasks.map((x) => (x.id === id ? { ...x, title: t } : x)),
        events: [...s.events, ev(id, "renamed", Date.now(), t)],
      };
    }),

  setPriority: (id, priority) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, priority } : t)),
      events: [...s.events, ev(id, "priority", Date.now(), priority ?? "normal")],
    })),

  setEstimate: (id, estimateMin) =>
    set((s) => {
      if (s.tasks.find((t) => t.id === id)?.estimateMin === estimateMin) return {};
      return {
        tasks: s.tasks.map((t) => (t.id === id ? { ...t, estimateMin } : t)),
        events: [...s.events, ev(id, "estimated", Date.now(), estimateMin !== undefined ? String(estimateMin) : undefined)],
      };
    }),

  editingId: null,
  setEditing: (editingId) => set({ editingId }),

  addTask: (title, estimateMin, now = Date.now()) =>
    set((s) => {
      const id = crypto.randomUUID();
      return {
        tasks: [
          ...s.tasks,
          {
            id,
            title,
            estimateMin,
            scheduledFor: dayKey(now),
            status: "todo",
            sortOrder: Math.min(0, ...s.tasks.map((t) => t.sortOrder)) - 1,
          },
        ],
        events: [...s.events, ev(id, "created", now)],
      };
    }),

  addToToday: (id, now = Date.now()) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, scheduledFor: dayKey(now) } : t)),
      events: [...s.events, ev(id, "rescheduled", now, dayKey(now))],
    })),

  addAllOverdueToToday: (now = Date.now()) =>
    set((s) => {
      const today = dayKey(now);
      const moved = s.tasks.filter((t) => t.status === "todo" && t.scheduledFor !== undefined && t.scheduledFor < today);
      return {
        tasks: s.tasks.map((t) =>
          t.status === "todo" && t.scheduledFor && t.scheduledFor < today
            ? { ...t, scheduledFor: today }
            : t
        ),
        events: [...s.events, ...moved.map((t) => ev(t.id, "rescheduled", now, today))],
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

  dismissIdleSheet: () => set({ idleSpan: null }),

  resolveIdle: (taskMin, breakMin, skipMin) => {
    const activeId = get().activeTaskId ?? undefined;
    get().resolveIdleSegments([
      { kind: "task", taskId: activeId, min: activeId ? taskMin : 0 },
      { kind: "break", min: breakMin },
      { kind: "skip", min: skipMin },
    ]);
  },

  resolveIdleSegments: (allocs) =>
    set((s) => {
      if (!s.idleSpan) return {};
      const newTasks: Task[] = [];
      const newEvents: TaskEvent[] = [];
      const out: TimeEntry[] = [];
      let cursor = s.idleSpan.start;
      let nextSort = Math.max(0, ...s.tasks.map((t) => t.sortOrder)) + 1;
      for (const a of allocs) {
        if (a.min <= 0) continue;
        let taskId: string | null = null;
        if (a.kind === "task") {
          if (a.newTitle?.trim()) {
            const t: Task = {
              id: crypto.randomUUID(),
              title: a.newTitle.trim(),
              scheduledFor: dayKey(cursor),
              status: "todo",
              sortOrder: nextSort++,
            };
            newTasks.push(t);
            newEvents.push(ev(t.id, "created", cursor));
            taskId = t.id;
          } else if (a.taskId) {
            taskId = a.taskId;
          } else {
            continue; // unassigned task segment writes nothing
          }
        }
        const kind: TimeEntry["kind"] = a.kind === "task" ? "work" : a.kind === "break" ? "break" : "discarded";
        out.push({ id: crypto.randomUUID(), taskId, kind, start: cursor, end: cursor + a.min * MIN });
        cursor += a.min * MIN;
      }
      return {
        tasks: [...s.tasks, ...newTasks],
        entries: [...s.entries, ...out],
        events: [...s.events, ...newEvents],
        idleSpan: null,
      };
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
      events: s.events,
      activeTaskId: s.activeTaskId,
      railOpen: s.railOpen,
      soundOn: s.soundOn,
      dismissedUpdate: s.dismissedUpdate,
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
