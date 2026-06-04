import { requireFlag } from "../../parser";
import { createTicket, findEvent, ticketView } from ".";
import { commandResponse } from "../response";
import { RequiresPermission } from "../permissions";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

@RequiresPermission("write")
export class CreateTicket implements CliAction {

  run({ state, command }: CommandContext): CliResponse {
    const eventId = requireFlag(command.flags, "event");
    findEvent(state, eventId);
    const ticket = createTicket(state, eventId, command.flags);
    state.tickets.push(ticket);
    return commandResponse(command, "Create ticket", ticketView(ticket));
  }
}
