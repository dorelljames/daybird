import { describe, expect, test } from "vitest";
import { isNewerVersion } from "./version";

describe("isNewerVersion", () => {
  test("detects newer patch/minor/major", () => {
    expect(isNewerVersion("0.1.0", "0.1.1")).toBe(true);
    expect(isNewerVersion("0.1.0", "0.2.0")).toBe(true);
    expect(isNewerVersion("0.9.9", "1.0.0")).toBe(true);
  });
  test("same or older is not newer", () => {
    expect(isNewerVersion("0.1.0", "0.1.0")).toBe(false);
    expect(isNewerVersion("0.2.0", "0.1.9")).toBe(false);
    expect(isNewerVersion("1.0.0", "0.9.9")).toBe(false);
  });
  test("tolerates v prefixes and short versions", () => {
    expect(isNewerVersion("v0.1.0", "v0.2")).toBe(true);
    expect(isNewerVersion("0.1", "0.1.0")).toBe(false);
  });
});
