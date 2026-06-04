import { CliError, flagString, findById } from "../../parser";
import { RequiresPermission } from "../permissions";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

@RequiresPermission("resend")
export class ResendOrder implements CliAction {

  run({ state, command }: CommandContext): CliResponse {
    const order = findById(state.orders, command.subject, "order");
    const email = flagString(command.flags, "email", order.buyerEmail) ?? order.buyerEmail;
    if (order.status !== "paid") {
      throw new CliError(
        `Only paid orders can be resent. ${order.id} is ${order.status}.`,
        "business_rule",
      );
    }
    order.lastDeliveryAt = new Date().toISOString();
    const preview = {
      orderId: order.id,
      sentTo: email,
      ticketCount: order.ticketIds.length,
      delivery: "mock_email",
    };
    if (command.dryRun) {
      return {
        status: "dry-run",
        message: "Resend tickets preview; no changes applied.",
        data: preview,
        exitCode: 0,
      };
    }
    return {
      status: "ok",
      message: "Resend tickets completed",
      data: preview,
      exitCode: 0,
    };
  }
}
