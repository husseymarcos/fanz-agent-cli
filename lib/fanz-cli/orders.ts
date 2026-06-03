import { requirePermission } from "./auth";
import { CliError, flagString, findById } from "./parser";
import type { Command } from "./parser";
import type { FanzState } from "./data";
import type { CliResponse } from "./engine";

export type OrderStatus = "paid" | "pending" | "refunded" | "cancelled";

export type Order = {
  id: string;
  eventId: string;
  buyerName: string;
  buyerEmail: string;
  status: OrderStatus;
  ticketIds: string[];
  subtotal: { amount: number; currency: "ARS" };
  discountCode?: string;
  discountAmount: { amount: number; currency: "ARS" };
  total: { amount: number; currency: "ARS" };
  createdAt: string;
  lastDeliveryAt?: string;
};

export type IssuedTicket = {
  id: string;
  ticketTypeId: string;
  ticketName: string;
  holderEmail: string;
  checkedIn: boolean;
};

export function orders(state: FanzState, command: Command): CliResponse {
  switch (command.action) {
    case "show": {
      requirePermission(state, "read");
      const order = findById(state.orders, command.subject, "order");
      return {
        status: "ok",
        message: "Order",
        data: orderView(state, order, true),
        exitCode: 0,
      };
    }
    case "resend": {
      requirePermission(state, "resend");
      if (command.dryRun) {
        const snapshot = structuredClone(state);
        const order = findById(state.orders, command.subject, "order");
        if (order.status !== "paid") {
          throw new CliError(
            `Only paid orders can be resent. ${order.id} is ${order.status}.`,
            "business_rule",
          );
        }
        const email = flagString(command.flags, "email", order.buyerEmail) ?? order.buyerEmail;
        order.lastDeliveryAt = new Date().toISOString();
        const preview = {
          orderId: order.id,
          sentTo: email,
          ticketCount: order.ticketIds.length,
          delivery: "mock_email",
        };
        Object.assign(state, snapshot);
        return {
          status: "dry-run",
          message: "Resend tickets preview; no changes applied.",
          data: preview,
          exitCode: 0,
        };
      }
      const order = findById(state.orders, command.subject, "order");
      if (order.status !== "paid") {
        throw new CliError(
          `Only paid orders can be resent. ${order.id} is ${order.status}.`,
          "business_rule",
        );
      }
      const email = flagString(command.flags, "email", order.buyerEmail) ?? order.buyerEmail;
      order.lastDeliveryAt = new Date().toISOString();
      return {
        status: "ok",
        message: "Resend tickets completed",
        data: {
          orderId: order.id,
          sentTo: email,
          ticketCount: order.ticketIds.length,
          delivery: "mock_email",
        },
        exitCode: 0,
      };
    }
    default:
      throw new CliError(
        "Use: fanz orders show ORD_100 | resend ORD_100 --email test@example.test",
      );
  }
}

export function orderView(state: FanzState, order: Order, includeTickets = false) {
  const base = {
    id: order.id,
    eventId: order.eventId,
    buyerName: order.buyerName,
    buyerEmail: order.buyerEmail,
    status: order.status,
    tickets: order.ticketIds.length,
    subtotalARS: order.subtotal.amount,
    discountCode: order.discountCode ?? "",
    discountARS: order.discountAmount.amount,
    totalARS: order.total.amount,
    createdAt: order.createdAt,
    lastDeliveryAt: order.lastDeliveryAt ?? "",
  };

  if (!includeTickets) return base;
  return {
    ...base,
    issuedTickets: order.ticketIds
      .map((id) => state.issuedTickets.find((ticket) => ticket.id === id))
      .filter(Boolean),
  };
}
