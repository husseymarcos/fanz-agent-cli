import { requirePermission } from "../core/auth";
import { applyTicketFlags, createTicket } from "../catalog/builders";
import { mutate } from "../core/mutations";
import { CliError, requireFlag } from "../core/parser";
import { ok } from "../core/responses";
import { findById, findEvent, requireEventFlagOrSubject, resourceId } from "../core/selectors";
import { ticketView } from "../presentation/views";
import type { Command } from "../core/command";
import type { CliResponse, FanzState } from "../types";

export function tickets(state: FanzState, command: Command): CliResponse {
  switch (command.action) {
    case "list": {
      requirePermission(state, "read");
      const eventId = requireEventFlagOrSubject(command);
      findEvent(state, eventId);
      return ok("Tickets", state.tickets.filter((ticket) => ticket.eventId === eventId).map(ticketView));
    }
    case "create":
      return mutate(state, command, "write", "Create ticket", () => {
        const eventId = requireFlag(command.flags, "event");
        findEvent(state, eventId);
        const ticket = createTicket(state, eventId, command.flags);
        state.tickets.push(ticket);
        return ticketView(ticket);
      });
    case "update":
      return mutate(state, command, "write", "Update ticket", () => {
        const ticket = findById(state.tickets, resourceId(command), "ticket");
        applyTicketFlags(ticket, command.flags);
        return ticketView(ticket);
      });
    case "delete":
      return mutate(state, command, "delete", "Delete ticket", () => {
        const ticket = findById(state.tickets, resourceId(command), "ticket");
        if (ticket.sold > 0) {
          throw new CliError(`Ticket ${ticket.id} has ${ticket.sold} sold units; pause it instead.`, "business_rule");
        }
        state.tickets = state.tickets.filter((item) => item.id !== ticket.id);
        return { deleted: ticket.id };
      });
    default:
      throw new CliError("Use: fanz tickets list --event EVT_100 | create | update | delete");
  }
}
