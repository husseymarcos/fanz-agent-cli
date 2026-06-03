import { describe, expect, test } from "bun:test";
import {
  tokenize,
  parseCommand,
  flagString,
  flagNumber,
  requireFlag,
  findById,
  resourceId,
  requireEventFlagOrSubject,
} from "../lib/parser";
import type { Command } from "../lib/parser";

describe("reading typed words", () => {
  test("separates a simple command into words", () => {
    expect(tokenize("fanz events list")).toEqual(["fanz", "events", "list"]);
  });

  test("keeps double-quoted text together", () => {
    expect(tokenize('say "hello world"')).toEqual(["say", "hello world"]);
  });

  test("keeps single-quoted text together", () => {
    expect(tokenize("say 'hello world'")).toEqual(["say", "hello world"]);
  });

  test("allows quote characters inside quoted text", () => {
    expect(tokenize('say "hello \\"world\\""')).toEqual(["say", 'hello "world"']);
  });

  test("keeps different quoted phrases separate", () => {
    expect(tokenize(`cmd "a b" 'c d'`)).toEqual(["cmd", "a b", "c d"]);
  });

  test("warns when double quotes are left open", () => {
    expect(() => tokenize('cmd "open')).toThrow(/Missing closing "/);
  });

  test("warns when single quotes are left open", () => {
    expect(() => tokenize("cmd 'open")).toThrow(/Missing closing '/);
  });

  test("keeps a backslash at the end of a word", () => {
    expect(tokenize("cmd hello\\")).toEqual(["cmd", "hello\\"]);
  });
});

describe("understanding typed commands", () => {
  test("recognizes which command the user wants to run", () => {
    const cmd = parseCommand("fanz events list");
    expect(cmd.namespace).toBe("events");
    expect(cmd.action).toBe("list");
    expect(cmd.subject).toBeUndefined();
  });

  test("recognizes the item named after the command", () => {
    const cmd = parseCommand("fanz events delete EVT_100");
    expect(cmd.action).toBe("delete");
    expect(cmd.subject).toBe("EVT_100");
  });

  test("recognizes on-off options", () => {
    const cmd = parseCommand("fanz events list --json --dry-run");
    expect(cmd.flags.json).toBe(true);
    expect(cmd.flags["dry-run"]).toBe(true);
    expect(cmd.json).toBe(true);
    expect(cmd.dryRun).toBe(true);
  });

  test("recognizes options that include a value", () => {
    const cmd = parseCommand("fanz login --token mock_admin");
    expect(cmd.flags.token).toBe("mock_admin");
  });

  test("recognizes options written with an equals sign", () => {
    const cmd = parseCommand("fanz login --token=mock_admin");
    expect(cmd.flags.token).toBe("mock_admin");
  });

  test("keeps extra words after the options", () => {
    const cmd = parseCommand("fanz events create --name X Foo Bar");
    expect(cmd.positionals).toEqual(["Foo", "Bar"]);
  });

  test("asks for a command when the user enters nothing", () => {
    expect(() => parseCommand("")).toThrow(/Type a command/);
  });

  test("warns when an option is malformed", () => {
    expect(() => parseCommand("fanz events list --=")).toThrow(/Invalid flag/);
  });

  test("recognizes explicit confirmation", () => {
    const cmd = parseCommand("fanz reset --yes");
    expect(cmd.yes).toBe(true);
  });
});

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

describe("choosing which item to update", () => {
  test("uses the named date when the command starts with a date", () => {
    const cmd: Command = {
      raw: "",
      namespace: "dates",
      action: "update",
      subject: "DAT_100",
      positionals: [],
      flags: {},
      json: false,
      dryRun: false,
      yes: false,
    };
    expect(resourceId(cmd)).toBe("DAT_100");
  });

  test("uses the date after the event when both are provided", () => {
    const cmd: Command = {
      raw: "",
      namespace: "dates",
      action: "update",
      subject: "EVT_100",
      positionals: ["DAT_100"],
      flags: {},
      json: false,
      dryRun: false,
      yes: false,
    };
    expect(resourceId(cmd)).toBe("DAT_100");
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
