import { nextId } from "../../data";
import { CliError } from "../../parser";
import { flagNumber, flagString, requireFlag } from "../../flags";
import { commandResponse } from "../response";
import { findEvent } from "../events";
import { orderView } from ".";
import { RequiresPermission } from "../permissions";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

@RequiresPermission("write")
export class CreateOrder implements CliAction {

  run({ state, command }: CommandContext): CliResponse {
    const eventId = requireFlag(command.flags, "event");
    const ticketId = requireFlag(command.flags, "ticket");
    const buyerEmail = requireFlag(command.flags, "buyer-email");
    const buyerName = flagString(command.flags, "buyer-name", "Mock Buyer") ?? "Mock Buyer";
    const quantity = flagNumber(command.flags, "quantity", 1) ?? 1;

    findEvent(state, eventId);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new CliError("--quantity must be a positive integer", "validation_error");
    }

    const ticket = state.tickets.find((item) => item.id === ticketId && item.eventId === eventId);
    if (!ticket) {
      throw new CliError(
        `Ticket ${ticketId} was not found for event ${eventId}.`,
        "not_found",
      );
    }
    if (ticket.status !== "active") {
      throw new CliError(
        `Ticket ${ticket.id} is ${ticket.status}; only active tickets can be sold.`,
        "business_rule",
      );
    }

    const remaining = ticket.stock - ticket.sold;
    if (quantity > remaining) {
      throw new CliError(
        `Only ${remaining} tickets remain for ${ticket.id}.`,
        "business_rule",
      );
    }

    const issuedTicketIds = Array.from({ length: quantity }, () => nextId(state, "ISS"));
    const order = {
      id: nextId(state, "ORD"),
      eventId,
      buyerName,
      buyerEmail,
      status: "paid" as const,
      ticketIds: issuedTicketIds,
      subtotal: { amount: ticket.price.amount * quantity, currency: "ARS" as const },
      discountAmount: { amount: 0, currency: "ARS" as const },
      total: { amount: ticket.price.amount * quantity, currency: "ARS" as const },
      createdAt: new Date().toISOString(),
      lastDeliveryAt: new Date().toISOString(),
    };

    state.issuedTickets.push(
      ...issuedTicketIds.map((id) => ({
        id,
        ticketTypeId: ticket.id,
        ticketName: ticket.name,
        holderEmail: buyerEmail,
        checkedIn: false,
      })),
    );
    ticket.sold += quantity;
    state.orders.push(order);

    return commandResponse(command, "Create mock order", orderView(state, order, true));
  }
}
