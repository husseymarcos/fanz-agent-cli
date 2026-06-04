import type { CliResponse } from "./engine";

export function formatResponse(response: CliResponse, json: boolean): string {
  if (json) {
    const payload: Record<string, unknown> = {
      schemaVersion: 1,
      status: response.status,
      message: response.message,
      data: response.data ?? null,
      warnings: response.warnings ?? [],
      exitCode: response.exitCode,
    };
    const resource = responseResource(response.data);
    if (response.command) payload.command = response.command;
    if (resource) payload.resource = resource;
    if (response.code) payload.code = response.code;
    if (response.hint) payload.hint = response.hint;
    return JSON.stringify(payload, null, 2);
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

function responseResource(data: unknown) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : undefined;
  if (!id) return null;
  return {
    type: resourceTypeForId(id),
    id,
  };
}

function resourceTypeForId(id: string): string {
  const prefix = id.split("_")[0];
  const types: Record<string, string> = {
    AUD: "audit_entry",
    DAT: "date",
    DSC: "discount",
    EVT: "event",
    ISS: "issued_ticket",
    ORD: "order",
    TCK: "ticket",
  };
  return types[prefix] ?? "resource";
}
