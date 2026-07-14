import { beforeEach, describe, expect, test } from "vitest";
import { create, StoreApi, UseBoundStore } from "zustand";
import { storeCreator, DaybirdState } from "./store";
import { estimateRemainingMin, overdueTasks, todayTasks, workedMinToday } from "./selectors";
import { atToday, MIN } from "../lib/time";

let store: UseBoundStore<StoreApi<DaybirdState>>;
beforeEach(() => {
  store = create<DaybirdState>()(storeCreator);
});
const NOW = atToday(11, 0);

describe("task state", () => {
  test("toggleDone marks done with timestamp and back", () => {
    store.getState().toggleDone("t-journal", NOW);
    let t = store.getState().tasks.find((t) => t.id === "t-journal")!;
    expect(t.status).toBe("done");
    expect(t.completedAt).toBe(NOW);
    store.getState().toggleDone("t-journal", NOW);
    t = store.getState().tasks.find((t) => t.id === "t-journal")!;
    expect(t.status).toBe("todo");
    expect(t.completedAt).toBeUndefined();
  });
  test("dropTask is terminal but reversible and never deletes", () => {
    store.getState().dropTask("t-vwra", NOW);
    const t = store.getState().tasks.find((t) => t.id === "t-vwra")!;
    expect(t.status).toBe("dropped");
    expect(store.getState().tasks.length).toBe(6);
  });
  test("completing the active task stops the timer", () => {
    store.getState().startTimer("t-journal", NOW);
    store.getState().toggleDone("t-journal", NOW + 5 * MIN);
    expect(store.getState().activeTaskId).toBeNull();
    const open = store.getState().entries.find((e) => e.end === null);
    expect(open).toBeUndefined();
  });
  test("addToToday reschedules an overdue task", () => {
    store.getState().addToToday("t-dev-4563", NOW);
    expect(overdueTasks(store.getState(), NOW).map((t) => t.id)).not.toContain("t-dev-4563");
    expect(todayTasks(store.getState(), NOW).map((t) => t.id)).toContain("t-dev-4563");
  });
  test("addTask prepends a todo at the top of today", () => {
    store.getState().addTask("New thing", 25, NOW);
    const t = store.getState().tasks.at(-1)!;
    expect(t.title).toBe("New thing");
    expect(t.status).toBe("todo");
    expect(todayTasks(store.getState(), NOW)[0].id).toBe(t.id);
  });
});

describe("timer", () => {
  test("startTimer opens a work entry; switching closes previous", () => {
    store.getState().startTimer("t-journal", NOW);
    store.getState().startTimer("t-vwra", NOW + 10 * MIN);
    const entries = store.getState().entries;
    const closed = entries.find((e) => e.taskId === "t-journal" && e.start === NOW)!;
    expect(closed.end).toBe(NOW + 10 * MIN);
    const open = entries.find((e) => e.end === null)!;
    expect(open.taskId).toBe("t-vwra");
    expect(store.getState().activeTaskId).toBe("t-vwra");
  });
});

describe("idle allocation", () => {
  test("openIdleSheet trims the running entry to idle start", () => {
    store.getState().startTimer("t-vwra", NOW);
    const span = { start: NOW + 10 * MIN, end: NOW + 33 * MIN };
    store.getState().openIdleSheet(span);
    const trimmed = store.getState().entries.find((e) => e.taskId === "t-vwra" && e.start === NOW)!;
    expect(trimmed.end).toBe(span.start);
    expect(store.getState().idleSpan).toEqual(span);
  });
  test("resolveIdle writes task/break/skip entries covering the span", () => {
    store.getState().startTimer("t-vwra", NOW);
    store.getState().openIdleSheet({ start: NOW + 10 * MIN, end: NOW + 33 * MIN });
    store.getState().resolveIdle(9, 10, 4);
    const s = store.getState();
    expect(s.idleSpan).toBeNull();
    const span = s.entries.filter((e) => e.start >= NOW + 10 * MIN && e.end !== null && e.end <= NOW + 33 * MIN);
    expect(span.map((e) => e.kind)).toEqual(["work", "break", "discarded"]);
    expect(span[0].taskId).toBe("t-vwra");
    expect((span[2].end! - span[0].start) / MIN).toBe(23);
  });
});

describe("delete, undo, reorder, priority", () => {
  test("deleteTask removes the task and its entries, with undo toast", () => {
    store.getState().deleteTask("t-journal");
    const s = store.getState();
    expect(s.tasks.some((t) => t.id === "t-journal")).toBe(false);
    expect(s.entries.some((e) => e.taskId === "t-journal")).toBe(false);
    expect(s.toast?.message).toMatch(/deleted/i);
  });
  test("undoToast restores the pre-action state", () => {
    const tasksBefore = store.getState().tasks.length;
    store.getState().deleteTask("t-journal");
    store.getState().undoToast();
    const s = store.getState();
    expect(s.tasks.length).toBe(tasksBefore);
    expect(s.entries.some((e) => e.taskId === "t-journal")).toBe(true);
    expect(s.toast).toBeNull();
  });
  test("dropTask offers undo via toast", () => {
    store.getState().dropTask("t-vwra", NOW);
    expect(store.getState().toast?.message).toMatch(/discarded/i);
    store.getState().undoToast();
    expect(store.getState().tasks.find((t) => t.id === "t-vwra")!.status).toBe("todo");
  });
  test("reorderToday reassigns sort order", () => {
    store.getState().reorderToday(["t-vwra", "t-meditate", "t-journal"]);
    expect(todayTasks(store.getState(), NOW).map((t) => t.id)).toEqual(["t-vwra", "t-meditate", "t-journal"]);
  });
  test("renameTask updates the title, ignores empty input", () => {
    store.getState().renameTask("t-journal", "Evening journal");
    expect(store.getState().tasks.find((t) => t.id === "t-journal")!.title).toBe("Evening journal");
    store.getState().renameTask("t-journal", "   ");
    expect(store.getState().tasks.find((t) => t.id === "t-journal")!.title).toBe("Evening journal");
  });
  test("cyclePriority walks normal → high → later → normal", () => {
    store.getState().cyclePriority("t-meditate");
    expect(store.getState().tasks.find((t) => t.id === "t-meditate")!.priority).toBe("high");
    store.getState().cyclePriority("t-meditate");
    expect(store.getState().tasks.find((t) => t.id === "t-meditate")!.priority).toBe("later");
    store.getState().cyclePriority("t-meditate");
    expect(store.getState().tasks.find((t) => t.id === "t-meditate")!.priority).toBeUndefined();
  });
});

describe("selectors", () => {
  test("workedMinToday sums closed and open entries", () => {
    expect(workedMinToday(store.getState(), "t-journal", NOW)).toBe(50);
    store.getState().startTimer("t-journal", NOW);
    expect(workedMinToday(store.getState(), "t-journal", NOW + 10 * MIN)).toBe(60);
  });
  test("estimateRemainingMin sums max(0, estimate - worked) for today's todos", () => {
    // meditation 15-0 + journal 15-50→0 + vwra 55-30=25 → 40
    expect(estimateRemainingMin(store.getState(), NOW)).toBe(40);
  });
  test("overdue excludes done/dropped", () => {
    store.getState().dropTask("t-inbox", NOW);
    expect(overdueTasks(store.getState(), NOW).map((t) => t.id)).toEqual(["t-dev-4563", "t-dev-4535"]);
  });
});
