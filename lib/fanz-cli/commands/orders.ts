import { requirePermission } from "../core/auth";
import { mutate } from "../core/mutations";
import { CliError, flagString } from "../core/parser";
import { ok } from "../core/responses";
import { findById } from "../core/selectors";
import { orderView } from "../presentation/views";
import type { Command } from "../core/command";
import type { CliResponse, FanzState } from "../types";

export function orders(state: FanzState, command: Command): CliResponse {
  switch (command.action) {
    case "show": {
      requirePermission(state, "read");
      const order = findById(state.orders, command.subject, "order");
      return ok("Order", orderView(state, order, true));
    }
    case "resend":
      return mutate(state, command, "resend", "Resend tickets", () => {
        const order = findById(state.orders, command.subject, "order");
        if (order.status !== "paid") {
          throw new CliError(`Only paid orders can be resent. ${order.id} is ${order.status}.`, "business_rule");
        }
        const email = flagString(command.flags, "email", order.buyerEmail) ?? order.buyerEmail;
        order.lastDeliveryAt = new Date().toISOString();
        return { orderId: order.id, sentTo: email, ticketCount: order.ticketIds.length, delivery: "mock_email" };
      });
    default:
      throw new CliError("Use: fanz orders show ORD_100 | resend ORD_100 --email test@example.test");
  }
}
