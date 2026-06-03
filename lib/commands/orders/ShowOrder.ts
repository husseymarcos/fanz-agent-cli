import { requirePermission } from "../../auth";
import { orderView } from "../../orders";
import { findById } from "../../parser";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

export class ShowOrder implements CliAction {
  constructor(private context: CommandContext) {}

  run(): CliResponse {
    const { state, command } = this.context;
    requirePermission(state, "read");
    const order = findById(state.orders, command.subject, "order");
    return {
      status: "ok",
      message: "Order",
      data: orderView(state, order, true),
      exitCode: 0,
    };
  }
}
