import { describe, expect, test } from "vitest";
import { create } from "zustand";
import { storeCreator, DaybirdState } from "../state/store";
import { completionCue, resolveCue } from "./celebrate";
import { atToday } from "./time";

const NOW = atToday(11, 0);

describe("completionCue", () => {
  test("climbs one scale step per task already completed today", () => {
    const store = create<DaybirdState>()(storeCreator);
    expect(completionCue(store.getState(), "t-journal", NOW)).toEqual({ kind: "step", step: 0 });
    store.getState().toggleDone("t-journal", NOW);
    expect(completionCue(store.getState(), "t-meditate", NOW)).toEqual({ kind: "step", step: 1 });
  });
  test("completing the last todo of today is the all-done moment", () => {
    const store = create<DaybirdState>()(storeCreator);
    store.getState().toggleDone("t-journal", NOW);
    store.getState().toggleDone("t-meditate", NOW);
    // t-vwra is the last remaining today todo
    expect(completionCue(store.getState(), "t-vwra", NOW)).toEqual({ kind: "all-done" });
  });
  test("completing an overdue task climbs but never triggers all-done", () => {
    const store = create<DaybirdState>()(storeCreator);
    store.getState().toggleDone("t-journal", NOW);
    store.getState().toggleDone("t-meditate", NOW);
    expect(completionCue(store.getState(), "t-dev-4563", NOW)).toEqual({ kind: "step", step: 2 });
  });
});

describe("resolveCue", () => {
  test("dominant share decides the mood", () => {
    expect(resolveCue(15, 5, 3)).toBe("worked");
    expect(resolveCue(4, 16, 3)).toBe("rested");
    expect(resolveCue(2, 3, 18)).toBe("skipped");
  });
  test("ties favor the kinder reading: worked > rested > skipped", () => {
    expect(resolveCue(10, 10, 3)).toBe("worked");
    expect(resolveCue(0, 10, 10)).toBe("rested");
  });
});
