import { requirePermission } from "../../auth";
import { requireFlag } from "../../parser";
import { createTicket, findEvent, ticketView } from "../../tickets";
import { commandResponse } from "../response";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

export class CreateTicket implements CliAction {
  constructor(private context: CommandContext) {}

  run(): CliResponse {
    const { state, command } = this.context;
    requirePermission(state, "write");
    const eventId = requireFlag(command.flags, "event");
    findEvent(state, eventId);
    const ticket = createTicket(state, eventId, command.flags);
    state.tickets.push(ticket);
    return commandResponse(command, "Create ticket", ticketView(ticket));
  }
}
