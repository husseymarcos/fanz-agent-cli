import type { CliResponse } from "./engine";

export function formatResponse(response: CliResponse, json: boolean): string {
  if (json) {
    return JSON.stringify(
      {
        ok: response.status !== "error",
        status: response.status,
        message: response.message,
        data: response.data ?? null,
        exitCode: response.exitCode,
      },
      null,
      2,
    );
  }

  if (response.status === "error") return `Error: ${response.message}`;
  if (response.status === "dry-run")
    return `Dry run: ${response.message}\n${pretty(response.data)}`;
  if (response.data === undefined) return response.message;
  return `${response.message}\n${pretty(response.data)}`;
}

export function pretty(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return table(value);
  if (typeof value === "object") return table([value as Record<string, unknown>]);
  return String(value);
}

export function table(rows: unknown[]): string {
  const records = rows.filter(
    (row): row is Record<string, unknown> =>
      typeof row === "object" && row !== null,
  );
  if (records.length === 0) return "(empty)";

  const keys = Array.from(
    records.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );
  const values = records.map((row) => keys.map((key) => stringifyCell(row[key])));
  const widths = keys.map((key, index) =>
    Math.min(34, Math.max(key.length, ...values.map((row) => row[index].length))),
  );

  const formatRow = (cells: string[]) =>
    cells
      .map((cell, index) => cell.padEnd(widths[index]).slice(0, widths[index]))
      .join("  ");

  return [
    formatRow(keys),
    formatRow(keys.map((_, index) => "-".repeat(widths[index]))),
    ...values.map(formatRow),
  ].join("\n");
}

function stringifyCell(value: unknown): string {
  if (value === undefined) return "";
  if (value === null) return "null";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
