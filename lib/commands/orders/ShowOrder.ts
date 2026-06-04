import { findById } from "../../parser";
import { orderView } from ".";
import { RequiresPermission } from "../permissions";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

@RequiresPermission("read")
export class ShowOrder implements CliAction {

  run({ state, command }: CommandContext): CliResponse {
    const order = findById(state.orders, command.subject, "order");
    return {
      status: "ok",
      message: "Order",
      data: orderView(state, order, true),
      exitCode: 0,
    };
  }
}
