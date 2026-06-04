import { findEvent } from "../events";
import { orderView } from "../orders";
import { requireEventFlagOrSubject } from "../helpers";
import { RequiresPermission } from "../permissions";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

@RequiresPermission("read")
export class ListSales implements CliAction {

  run({ state, command }: CommandContext): CliResponse {
    const eventId = requireEventFlagOrSubject(command);
    findEvent(state, eventId);
    const rows = state.orders
      .filter((order) => order.eventId === eventId)
      .map((order) => orderView(state, order));
    return { status: "ok", message: "Sales", data: rows, exitCode: 0 };
  }
}
