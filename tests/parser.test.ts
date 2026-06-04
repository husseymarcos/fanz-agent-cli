import { describe, expect, test } from "bun:test";
import { tokenize, parseCommand } from "../lib/parser";

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

describe("choosing an event", () => {
  test("uses the event option first", () => {
    const cmd = parseCommand("fanz dates list --event EVT_100");
    expect(cmd.flags.event).toBe("EVT_100");
  });

  test("uses the event written after the command", () => {
    const cmd = parseCommand("fanz dates list EVT_100");
    expect(cmd.subject).toBe("EVT_100");
  });
});
