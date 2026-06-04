import { describe, expect, test } from "bun:test";
import { findById, requireEventFlagOrSubject } from "../lib/commands/helpers";
import { parseCommand } from "../lib/parser";

describe("finding a saved item", () => {
  const items = [
    { id: "A_1", name: "Alpha" },
    { id: "B_2", name: "Beta" },
  ];

  test("finds the matching item", () => {
    expect(findById(items, "B_2", "item")).toEqual(items[1]);
  });

  test("warns when no item is named", () => {
    expect(() => findById(items, undefined, "item")).toThrow(/Missing item id/);
  });

  test("warns when the item cannot be found", () => {
    expect(() => findById(items, "C_3", "item")).toThrow(/Item C_3 was not found/);
  });
});

describe("choosing an event", () => {
  test("uses the event option first", () => {
    const cmd = parseCommand("fanz dates list --event EVT_100");
    expect(requireEventFlagOrSubject(cmd)).toBe("EVT_100");
  });

  test("uses the event written after the command", () => {
    const cmd = parseCommand("fanz dates list EVT_100");
    expect(requireEventFlagOrSubject(cmd)).toBe("EVT_100");
  });

  test("warns when no event is named", () => {
    const cmd = parseCommand("fanz dates list");
    expect(() => requireEventFlagOrSubject(cmd)).toThrow(/Missing event id/);
  });
});
