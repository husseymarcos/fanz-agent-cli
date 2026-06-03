import { describe, expect, test } from "bun:test";
import { formatResponse, pretty, table } from "../lib/fanz-cli/format";
import type { CliResponse } from "../lib/fanz-cli/engine";

describe("format", () => {
  describe("formatResponse", () => {
    test("json output wraps response", () => {
      const response: CliResponse = {
        status: "ok",
        message: "Done",
        data: { id: 1 },
        exitCode: 0,
      };
      const text = formatResponse(response, true);
      const parsed = JSON.parse(text);
      expect(parsed.ok).toBe(true);
      expect(parsed.status).toBe("ok");
      expect(parsed.data.id).toBe(1);
    });

    test("json output for error includes data", () => {
      const response: CliResponse = {
        status: "error",
        message: "Oops",
        data: { code: "fail" },
        exitCode: 1,
      };
      const text = formatResponse(response, true);
      const parsed = JSON.parse(text);
      expect(parsed.ok).toBe(false);
      expect(parsed.data.code).toBe("fail");
    });

    test("plain error prepends 'Error:'", () => {
      const response: CliResponse = { status: "error", message: "Oops", exitCode: 1 };
      expect(formatResponse(response, false)).toBe("Error: Oops");
    });

    test("plain dry-run prepends 'Dry run:'", () => {
      const response: CliResponse = { status: "dry-run", message: "Preview", data: { a: 1 }, exitCode: 0 };
      expect(formatResponse(response, false)).toMatch(/Dry run: Preview/);
    });

    test("plain ok with no data returns message", () => {
      const response: CliResponse = { status: "ok", message: "Hello", exitCode: 0 };
      expect(formatResponse(response, false)).toBe("Hello");
    });

    test("plain ok with data appends table", () => {
      const response: CliResponse = { status: "ok", message: "Result", data: [{ x: 1 }], exitCode: 0 };
      const text = formatResponse(response, false);
      expect(text).toMatch(/Result/);
      expect(text).toMatch(/x/);
    });
  });

  describe("table", () => {
    test("renders simple rows", () => {
      const out = table([
        { a: "1", b: "2" },
        { a: "3", b: "4" },
      ]);
      expect(out).toMatch(/a\s+b/);
      expect(out).toMatch(/1\s+2/);
    });

    test("truncates long cells to 34 chars", () => {
      const out = table([{ col: "a".repeat(50) }]);
      expect(out).not.toMatch(/a{50}/);
    });

    test("returns (empty) for empty array", () => {
      expect(table([])).toBe("(empty)");
    });

    test("returns (empty) for non-object rows", () => {
      expect(table([null, undefined, "text"] as unknown as Record<string, unknown>[])).toBe("(empty)");
    });
  });

  describe("pretty", () => {
    test("formats arrays as table", () => {
      const out = pretty([{ a: 1 }]);
      expect(out).toMatch(/a/);
    });

    test("formats objects as single-row table", () => {
      const out = pretty({ a: 1 });
      expect(out).toMatch(/a/);
    });

    test("returns empty string for undefined", () => {
      expect(pretty(undefined)).toBe("");
    });

    test("returns empty string for null", () => {
      expect(pretty(null)).toBe("");
    });

    test("returns string for primitives", () => {
      expect(pretty(42)).toBe("42");
    });
  });
});
