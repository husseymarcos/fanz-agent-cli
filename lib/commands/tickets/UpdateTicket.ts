import { findById, resourceId } from "../../parser";
import { applyTicketFlags, ticketView } from ".";
import { commandResponse } from "../response";
import { RequiresPermission } from "../permissions";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

@RequiresPermission("write")
export class UpdateTicket implements CliAction {

  run({ state, command }: CommandContext): CliResponse {
    const ticket = findById(state.tickets, resourceId(command), "ticket");
    applyTicketFlags(ticket, command.flags);
    return commandResponse(command, "Update ticket", ticketView(ticket));
  }
}
