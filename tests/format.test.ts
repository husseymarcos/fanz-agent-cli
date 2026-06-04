import { describe, expect, test } from "bun:test";
import { formatResponse, pretty, table } from "../lib/format";
import type { CliResponse } from "../lib/engine";

describe("displaying command results", () => {
  describe("machine-readable output", () => {
    test("successful results include the message and data", () => {
      const response: CliResponse = {
        status: "ok",
        message: "Done",
        data: { id: 1 },
        exitCode: 0,
      };
      const text = formatResponse(response, true);
      const parsed = JSON.parse(text);
      expect(parsed.schemaVersion).toBe(1);
      expect(parsed.ok).toBe(true);
      expect(parsed.status).toBe("ok");
      expect(parsed.data.id).toBe(1);
      expect(Array.isArray(parsed.warnings)).toBe(true);
    });

    test("failed results include helpful details", () => {
      const response: CliResponse = {
        status: "error",
        message: "Oops",
        code: "fail",
        hint: "Retry differently",
        data: { code: "fail" },
        exitCode: 1,
      };
      const text = formatResponse(response, true);
      const parsed = JSON.parse(text);
      expect(parsed.ok).toBe(false);
      expect(parsed.code).toBe("fail");
      expect(parsed.hint).toBe("Retry differently");
      expect(parsed.data.code).toBe("fail");
    });

    test("machine-readable output exposes resource ids when possible", () => {
      const response: CliResponse = {
        status: "ok",
        message: "Created",
        data: { id: "ORD_102" },
        exitCode: 0,
      };
      const parsed = JSON.parse(formatResponse(response, true));
      expect(parsed.resource).toEqual({ type: "order", id: "ORD_102" });
    });

    test("errors are clearly labeled", () => {
      const response: CliResponse = { status: "error", message: "Oops", exitCode: 1 };
      expect(formatResponse(response, false)).toBe("Error: Oops");
    });

    test("previews are clearly labeled", () => {
      const response: CliResponse = { status: "dry-run", message: "Preview", data: { a: 1 }, exitCode: 0 };
      expect(formatResponse(response, false)).toMatch(/Dry run: Preview/);
    });

    test("simple success messages are shown as text", () => {
      const response: CliResponse = { status: "ok", message: "Hello", exitCode: 0 };
      expect(formatResponse(response, false)).toBe("Hello");
    });

    test("success messages with details show a table", () => {
      const response: CliResponse = { status: "ok", message: "Result", data: [{ x: 1 }], exitCode: 0 };
      const text = formatResponse(response, false);
      expect(text).toMatch(/Result/);
      expect(text).toMatch(/x/);
    });
  });

  describe("tables", () => {
    test("shows rows and column names", () => {
      const out = table([
        { a: "1", b: "2" },
        { a: "3", b: "4" },
      ]);
      expect(out).toMatch(/a\s+b/);
      expect(out).toMatch(/1\s+2/);
    });

    test("shortens overly long values", () => {
      const out = table([{ col: "a".repeat(50) }]);
      expect(out).not.toMatch(/a{50}/);
    });

    test("says when there is nothing to show", () => {
      expect(table([])).toBe("(empty)");
    });

    test("says empty when rows cannot be displayed", () => {
      expect(table([null, undefined, "text"] as unknown as Record<string, unknown>[])).toBe("(empty)");
    });
  });

  describe("automatic display", () => {
    test("shows lists as tables", () => {
      const out = pretty([{ a: 1 }]);
      expect(out).toMatch(/a/);
    });

    test("shows one record as a table", () => {
      const out = pretty({ a: 1 });
      expect(out).toMatch(/a/);
    });

    test("shows nothing for missing data", () => {
      expect(pretty(undefined)).toBe("");
    });

    test("shows nothing for empty data", () => {
      expect(pretty(null)).toBe("");
    });

    test("shows simple values as text", () => {
      expect(pretty(42)).toBe("42");
    });
  });
});
