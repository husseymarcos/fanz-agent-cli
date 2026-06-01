import type { ParsedCommand } from "../types";

export class CliError extends Error {
  constructor(
    message: string,
    readonly code = "invalid_command",
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | undefined;
  let escaping = false;

  for (const char of input.trim()) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }

    if (char === "\\") {
      escaping = true;
      continue;
    }

    if (quote) {
      if (char === quote) quote = undefined;
      else current += char;
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (quote) throw new CliError(`Missing closing ${quote} quote`, "parse_error");
  if (escaping) current += "\\";
  if (current) tokens.push(current);
  return tokens;
}

export function parseCommand(input: string): ParsedCommand {
  const tokens = tokenize(input);
  if (tokens[0] === "fanz") tokens.shift();
  if (tokens.length === 0) throw new CliError("Type a command, for example: fanz help");

  const namespace = tokens.shift() ?? "";
  const action = tokens[0]?.startsWith("--") ? undefined : tokens.shift();
  const subject = tokens[0]?.startsWith("--") ? undefined : tokens.shift();
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }

    const flag = token.slice(2);
    const separatorIndex = flag.indexOf("=");
    const rawKey = separatorIndex === -1 ? flag : flag.slice(0, separatorIndex);
    const inlineValue = separatorIndex === -1 ? undefined : flag.slice(separatorIndex + 1);
    if (!rawKey) throw new CliError(`Invalid flag ${token}`, "parse_error");
    const key = rawKey.trim();

    if (inlineValue !== undefined) {
      flags[key] = inlineValue;
      continue;
    }

    const next = tokens[index + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }

    flags[key] = next;
    index += 1;
  }

  return {
    raw: input,
    namespace,
    action,
    subject,
    positionals,
    flags,
    json: flags.json === true,
    dryRun: flags["dry-run"] === true,
    yes: flags.yes === true,
  };
}

export function flagString(
  flags: Record<string, string | boolean>,
  name: string,
  fallback?: string,
): string | undefined {
  const value = flags[name];
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

export function flagNumber(
  flags: Record<string, string | boolean>,
  name: string,
  fallback?: number,
): number | undefined {
  const value = flags[name];
  if (typeof value !== "string") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new CliError(`--${name} must be a number`, "validation_error");
  }
  return parsed;
}

export function requireFlag(
  flags: Record<string, string | boolean>,
  name: string,
): string {
  const value = flagString(flags, name);
  if (!value) throw new CliError(`Missing required flag --${name}`, "validation_error");
  return value;
}
