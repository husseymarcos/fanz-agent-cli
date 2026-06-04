import { describe, expect, test } from "bun:test";
import { flagString, flagNumber, requireFlag } from "../lib/flags";

describe("text options", () => {
  test("uses the provided text", () => {
    expect(flagString({ name: "Fanz" }, "name")).toBe("Fanz");
  });

  test("uses a default when the option is missing", () => {
    expect(flagString({}, "name", "default")).toBe("default");
  });

  test("leaves the value blank when the option is missing", () => {
    expect(flagString({}, "name")).toBeUndefined();
  });

  test("does not treat an on-off option as text", () => {
    expect(flagString({ name: true }, "name")).toBeUndefined();
  });

  test("ignores extra spaces around text", () => {
    expect(flagString({ name: "  spaced  " }, "name")).toBe("spaced");
  });
});

describe("number options", () => {
  test("accepts whole numbers", () => {
    expect(flagNumber({ price: "100" }, "price")).toBe(100);
  });

  test("accepts zero", () => {
    expect(flagNumber({ price: "0" }, "price")).toBe(0);
  });

  test("uses a default when the option is missing", () => {
    expect(flagNumber({}, "price", 50)).toBe(50);
  });

  test("warns when the value is not a number", () => {
    expect(() => flagNumber({ price: "abc" }, "price")).toThrow(/must be a number/);
  });

  test("warns when the value is not a real amount", () => {
    expect(() => flagNumber({ price: "Infinity" }, "price")).toThrow(/must be a number/);
  });

  test("leaves the value blank when the option is missing", () => {
    expect(flagNumber({}, "price")).toBeUndefined();
  });
});

describe("required options", () => {
  test("uses the value when the user provides it", () => {
    expect(requireFlag({ name: "X" }, "name")).toBe("X");
  });

  test("warns when the option is missing", () => {
    expect(() => requireFlag({}, "name")).toThrow(/Missing required flag --name/);
  });

  test("warns when the option has no value", () => {
    expect(() => requireFlag({ name: true }, "name")).toThrow(/Missing required flag --name/);
  });
});
