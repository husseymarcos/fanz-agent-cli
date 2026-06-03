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
  CliError,
} from "../lib/fanz-cli/parser";
import type { Command } from "../lib/fanz-cli/parser";

describe("tokenizer", () => {
  test("splits plain words", () => {
    expect(tokenize("fanz events list")).toEqual(["fanz", "events", "list"]);
  });

  test("respects double quotes", () => {
    expect(tokenize('say "hello world"')).toEqual(["say", "hello world"]);
  });

  test("respects single quotes", () => {
    expect(tokenize("say 'hello world'")).toEqual(["say", "hello world"]);
  });

  test("handles escaped characters", () => {
    expect(tokenize('say "hello \\"world\\""')).toEqual(["say", 'hello "world"']);
  });

  test("handles mixed quotes", () => {
    expect(tokenize(`cmd "a b" 'c d'`)).toEqual(["cmd", "a b", "c d"]);
  });

  test("throws on unclosed double quote", () => {
    expect(() => tokenize('cmd "open')).toThrow(/Missing closing "/);
  });

  test("throws on unclosed single quote", () => {
    expect(() => tokenize("cmd 'open")).toThrow(/Missing closing '/);
  });

  test("preserves trailing backslash as literal", () => {
    expect(tokenize("cmd hello\\")).toEqual(["cmd", "hello\\"]);
  });
});

describe("parseCommand", () => {
  test("extracts namespace and action", () => {
    const cmd = parseCommand("fanz events list");
    expect(cmd.namespace).toBe("events");
    expect(cmd.action).toBe("list");
    expect(cmd.subject).toBeUndefined();
  });

  test("extracts subject", () => {
    const cmd = parseCommand("fanz events delete EVT_100");
    expect(cmd.action).toBe("delete");
    expect(cmd.subject).toBe("EVT_100");
  });

  test("extracts boolean flags", () => {
    const cmd = parseCommand("fanz events list --json --dry-run");
    expect(cmd.flags.json).toBe(true);
    expect(cmd.flags["dry-run"]).toBe(true);
    expect(cmd.json).toBe(true);
    expect(cmd.dryRun).toBe(true);
  });

  test("extracts value flags", () => {
    const cmd = parseCommand("fanz login --token mock_admin");
    expect(cmd.flags.token).toBe("mock_admin");
  });

  test("extracts inline flag values", () => {
    const cmd = parseCommand("fanz login --token=mock_admin");
    expect(cmd.flags.token).toBe("mock_admin");
  });

  test("collects positionals after flags", () => {
    const cmd = parseCommand("fanz events create --name X Foo Bar");
    expect(cmd.positionals).toEqual(["Foo", "Bar"]);
  });

  test("throws on empty input", () => {
    expect(() => parseCommand("")).toThrow(/Type a command/);
  });

  test("throws on invalid flag syntax", () => {
    expect(() => parseCommand("fanz events list --=")).toThrow(/Invalid flag/);
  });

  test("yes flag is parsed", () => {
    const cmd = parseCommand("fanz reset --yes");
    expect(cmd.yes).toBe(true);
  });
});

describe("flagString", () => {
  test("returns string value", () => {
    expect(flagString({ name: "Fanz" }, "name")).toBe("Fanz");
  });

  test("returns fallback when missing", () => {
    expect(flagString({}, "name", "default")).toBe("default");
  });

  test("returns undefined when missing and no fallback", () => {
    expect(flagString({}, "name")).toBeUndefined();
  });

  test("ignores boolean flags", () => {
    expect(flagString({ name: true }, "name")).toBeUndefined();
  });

  test("trims values", () => {
    expect(flagString({ name: "  spaced  " }, "name")).toBe("spaced");
  });
});

describe("flagNumber", () => {
  test("parses integer", () => {
    expect(flagNumber({ price: "100" }, "price")).toBe(100);
  });

  test("parses zero", () => {
    expect(flagNumber({ price: "0" }, "price")).toBe(0);
  });

  test("returns fallback when missing", () => {
    expect(flagNumber({}, "price", 50)).toBe(50);
  });

  test("throws on non-numeric string", () => {
    expect(() => flagNumber({ price: "abc" }, "price")).toThrow(/must be a number/);
  });

  test("throws on Infinity", () => {
    expect(() => flagNumber({ price: "Infinity" }, "price")).toThrow(/must be a number/);
  });

  test("returns undefined when missing without fallback", () => {
    expect(flagNumber({}, "price")).toBeUndefined();
  });
});

describe("requireFlag", () => {
  test("returns value when present", () => {
    expect(requireFlag({ name: "X" }, "name")).toBe("X");
  });

  test("throws when missing", () => {
    expect(() => requireFlag({}, "name")).toThrow(/Missing required flag --name/);
  });

  test("throws when boolean", () => {
    expect(() => requireFlag({ name: true }, "name")).toThrow(/Missing required flag --name/);
  });
});

describe("findById", () => {
  const items = [
    { id: "A_1", name: "Alpha" },
    { id: "B_2", name: "Beta" },
  ];

  test("finds existing item", () => {
    expect(findById(items, "B_2", "item")).toEqual(items[1]);
  });

  test("throws when id is undefined", () => {
    expect(() => findById(items, undefined, "item")).toThrow(/Missing item id/);
  });

  test("throws when not found", () => {
    expect(() => findById(items, "C_3", "item")).toThrow(/Item C_3 was not found/);
  });
});

describe("resourceId", () => {
  test("returns subject when it does not look like an event id", () => {
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

  test("returns first positional when subject looks like an event id", () => {
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

describe("requireEventFlagOrSubject", () => {
  test("prefers --event flag", () => {
    const cmd = parseCommand("fanz dates list --event EVT_100");
    expect(requireEventFlagOrSubject(cmd)).toBe("EVT_100");
  });

  test("falls back to subject", () => {
    const cmd = parseCommand("fanz dates list EVT_100");
    expect(requireEventFlagOrSubject(cmd)).toBe("EVT_100");
  });

  test("throws when both missing", () => {
    const cmd = parseCommand("fanz dates list");
    expect(() => requireEventFlagOrSubject(cmd)).toThrow(/Missing event id/);
  });
});
