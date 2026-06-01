import { requirePermission } from "../core/auth";
import { buildEventSummary } from "../presentation/format";
import { CliError } from "../core/parser";
import { ok } from "../core/responses";
import { findEvent, requireEventFlagOrSubject } from "../core/selectors";
import { orderView, toCsv } from "../presentation/views";
import type { Command } from "../core/command";
import type { CliResponse, FanzState } from "../types";

export function sales(state: FanzState, command: Command): CliResponse {
  requirePermission(state, command.action === "export" ? "export" : "read");
  const eventId = requireEventFlagOrSubject(command);
  findEvent(state, eventId);
  const rows = state.orders.filter((order) => order.eventId === eventId).map((order) => orderView(state, order));

  switch (command.action) {
    case "list":
      return ok("Sales", rows);
    case "summary":
      return ok("Sales summary", buildEventSummary(state, eventId));
    case "export":
      return ok("CSV export", {
        filename: `sales-${eventId}.csv`,
        content: toCsv(rows),
      });
    default:
      throw new CliError("Use: fanz sales list|summary|export --event EVT_100");
  }
}
