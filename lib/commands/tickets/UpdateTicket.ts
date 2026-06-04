import { findById } from "../helpers";
import { applyTicketFlags, ticketView } from ".";
import { commandResponse } from "../response";
import { RequiresPermission } from "../permissions";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

@RequiresPermission("write")
export class UpdateTicket implements CliAction {

  run({ state, command }: CommandContext): CliResponse {
    const ticket = findById(state.tickets, command.subject, "ticket");
    applyTicketFlags(ticket, command.flags);
    return commandResponse(command, "Update ticket", ticketView(ticket));
  }
}
