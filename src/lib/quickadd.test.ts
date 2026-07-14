import { describe, expect, test } from "vitest";
import { parseDuration, parseQuickAdd } from "./quickadd";

describe("parseDuration", () => {
  test("parses minutes, hours, combined, and bare numbers", () => {
    expect(parseDuration("30m")).toBe(30);
    expect(parseDuration("1h")).toBe(60);
    expect(parseDuration("1h 20m")).toBe(80);
    expect(parseDuration("45")).toBe(45);
  });
  test("rejects junk and zero", () => {
    expect(parseDuration("soon")).toBeUndefined();
    expect(parseDuration("0m")).toBeUndefined();
    expect(parseDuration("")).toBeUndefined();
  });
});

describe("parseQuickAdd", () => {
  test("trailing ~Nm sets an estimate", () => {
    expect(parseQuickAdd("Write report ~30m")).toEqual({ title: "Write report", estimateMin: 30 });
  });
  test("hours and combined forms", () => {
    expect(parseQuickAdd("Ship it ~1h")).toEqual({ title: "Ship it", estimateMin: 60 });
    expect(parseQuickAdd("Deep work ~1h30m")).toEqual({ title: "Deep work", estimateMin: 90 });
    expect(parseQuickAdd("Quick ~45")).toEqual({ title: "Quick", estimateMin: 45 });
  });
  test("no marker leaves the title untouched", () => {
    expect(parseQuickAdd("Approx ~ nothing")).toEqual({ title: "Approx ~ nothing", estimateMin: undefined });
    expect(parseQuickAdd("Plain task")).toEqual({ title: "Plain task", estimateMin: undefined });
  });
  test("marker only in the middle does not trigger", () => {
    expect(parseQuickAdd("Read ~20m of the book daily")).toEqual({ title: "Read ~20m of the book daily", estimateMin: undefined });
  });
});
