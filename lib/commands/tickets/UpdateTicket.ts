import { requirePermission } from "../../auth";
import { findById, resourceId } from "../../parser";
import { applyTicketFlags, ticketView } from "../../tickets";
import { commandResponse } from "../response";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

export const route = "tickets.update";

export class UpdateTicket implements CliAction {
  constructor(private context: CommandContext) {}

  run(): CliResponse {
    const { state, command } = this.context;
    requirePermission(state, "write");
    const ticket = findById(state.tickets, resourceId(command), "ticket");
    applyTicketFlags(ticket, command.flags);
    return commandResponse(command, "Update ticket", ticketView(ticket));
  }
}
