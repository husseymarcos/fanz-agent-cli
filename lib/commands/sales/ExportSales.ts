import { requirePermission } from "../../auth";
import { findEvent } from "../../events";
import { orderView } from "../../orders";
import { requireEventFlagOrSubject } from "../../parser";
import { toCsv } from "../../sales";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

export class ExportSales implements CliAction {
  constructor(private context: CommandContext) {}

  run(): CliResponse {
    const { state, command } = this.context;
    requirePermission(state, "export");
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
