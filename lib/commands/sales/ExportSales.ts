import { findEvent } from "../events";
import { orderView } from "../orders";
import { requireEventFlagOrSubject } from "../helpers";
import { RequiresPermission } from "../permissions";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

function csvCell(value: unknown): string {
  const text = value === undefined || value === null ? "" : String(value);
  if (!/["",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = rows.map((row) => headers.map((key) => csvCell(row[key])).join(","));
  return [headers.join(","), ...lines].join("\n");
}

@RequiresPermission("export")
export class ExportSales implements CliAction {

  run({ state, command }: CommandContext): CliResponse {
    const eventId = requireEventFlagOrSubject(command);
    findEvent(state, eventId);
    const rows = state.orders
      .filter((order) => order.eventId === eventId)
      .map((order) => orderView(state, order));
    return {
      status: "ok",
      message: "CSV export",
      data: {
        filename: `sales-${eventId}.csv`,
        content: toCsv(rows),
      },
      exitCode: 0,
    };
  }
}
