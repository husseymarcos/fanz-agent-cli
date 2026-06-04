import { CliError } from "./parser";

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
