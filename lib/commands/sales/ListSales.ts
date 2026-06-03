import { requirePermission } from "../../auth";
import { findEvent } from "../../events";
import { orderView } from "../../orders";
import { requireEventFlagOrSubject } from "../../parser";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

export const route = "sales.list";

export class ListSales implements CliAction {
  constructor(private context: CommandContext) {}

  run(): CliResponse {
    const { state, command } = this.context;
    requirePermission(state, "read");
    const eventId = requireEventFlagOrSubject(command);
    findEvent(state, eventId);
    const rows = state.orders
      .filter((order) => order.eventId === eventId)
      .map((order) => orderView(state, order));
    return { status: "ok", message: "Sales", data: rows, exitCode: 0 };
  }
}
