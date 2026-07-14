import { describe, expect, test } from "vitest";
import { matchHotkey } from "./hotkeys";

const evt = (key: string, mods: Partial<{ meta: boolean; ctrl: boolean; shift: boolean; alt: boolean }> = {}) => ({
  key, metaKey: !!mods.meta, ctrlKey: !!mods.ctrl, shiftKey: !!mods.shift, altKey: !!mods.alt,
});

describe("matchHotkey", () => {
  test("mod matches meta or ctrl", () => {
    expect(matchHotkey(evt("1", { meta: true }), "mod+1")).toBe(true);
    expect(matchHotkey(evt("1", { ctrl: true }), "mod+1")).toBe(true);
    expect(matchHotkey(evt("1"), "mod+1")).toBe(false);
  });
  test("bare keys reject modified presses", () => {
    expect(matchHotkey(evt("e"), "e")).toBe(true);
    expect(matchHotkey(evt("e", { meta: true }), "e")).toBe(false);
  });
  test("space and shift combos", () => {
    expect(matchHotkey(evt(" "), "space")).toBe(true);
    expect(matchHotkey(evt("i", { meta: true, shift: true }), "mod+shift+i")).toBe(true);
    expect(matchHotkey(evt("i", { meta: true }), "mod+shift+i")).toBe(false);
  });
});
