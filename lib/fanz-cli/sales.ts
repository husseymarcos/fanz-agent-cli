import { requirePermission } from "./auth";
import { CliError } from "./parser";
import { findEvent, buildEventSummary } from "./events";
import { orderView } from "./orders";
import type { Command } from "./parser";
import type { FanzState } from "./data";
import type { CliResponse } from "./engine";

export function sales(state: FanzState, command: Command): CliResponse {
  requirePermission(state, command.action === "export" ? "export" : "read");
  const eventId = requireEventFlagOrSubject(command);
  findEvent(state, eventId);
  const rows = state.orders
    .filter((order) => order.eventId === eventId)
    .map((order) => orderView(state, order));

  switch (command.action) {
    case "list":
      return { status: "ok", message: "Sales", data: rows, exitCode: 0 };
    case "summary":
      return {
        status: "ok",
        message: "Sales summary",
        data: buildEventSummary(state, eventId),
        exitCode: 0,
      };
    case "export":
      return {
        status: "ok",
        message: "CSV export",
        data: {
          filename: `sales-${eventId}.csv`,
          content: toCsv(rows),
        },
        exitCode: 0,
      };
    default:
      throw new CliError("Use: fanz sales list|summary|export --event EVT_100");
  }
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = rows.map((row) => headers.map((key) => csvCell(row[key])).join(","));
  return [headers.join(","), ...lines].join("\n");
}

function csvCell(value: unknown): string {
  const text = value === undefined || value === null ? "" : String(value);
  if (!/["",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function requireEventFlagOrSubject(command: Command): string {
  return (
    flagString(command.flags, "event", command.subject) ??
    (() => {
      throw new CliError(
        "Missing event id. Use --event EVT_100 or pass it after the action.",
        "validation_error",
      );
    })()
  );
}

function flagString(
  flags: Record<string, string | boolean>,
  name: string,
  fallback?: string,
): string | undefined {
  const value = flags[name];
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}
