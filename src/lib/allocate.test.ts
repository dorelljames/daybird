import { describe, expect, test } from "vitest";
import { allocate, fractionsFromBoundaries } from "./allocate";

const closeTo = (got: number[], want: number[]) => {
  expect(got.length).toBe(want.length);
  got.forEach((v, i) => expect(v).toBeCloseTo(want[i], 10));
};

describe("fractionsFromBoundaries", () => {
  test("converts two boundary positions into three fractions", () => {
    closeTo(fractionsFromBoundaries(0.4, 0.8), [0.4, 0.4, 0.2]);
  });
  test("clamps and orders boundaries", () => {
    closeTo(fractionsFromBoundaries(-0.2, 1.4), [0, 1, 0]);
    closeTo(fractionsFromBoundaries(0.7, 0.3), [0.7, 0, 0.3]);
  });
});

describe("allocate", () => {
  test("splits minutes and always sums to total", () => {
    expect(allocate(23, [0.39, 0.44, 0.17])).toEqual([9, 10, 4]);
    for (let total = 1; total <= 120; total++) {
      const parts = allocate(total, [1 / 3, 1 / 3, 1 / 3]);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
    }
  });
  test("all-in-one presets", () => {
    expect(allocate(23, [1, 0, 0])).toEqual([23, 0, 0]);
    expect(allocate(23, [0, 0, 1])).toEqual([0, 0, 23]);
  });
});
