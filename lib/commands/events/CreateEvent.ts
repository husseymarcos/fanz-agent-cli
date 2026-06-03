import { requirePermission } from "../../auth";
import { createDate, createEvent, createTicketFromSpec, eventView } from "../../events";
import { flagString } from "../../parser";
import { commandResponse } from "../response";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

export const route = "events.create";

export class CreateEvent implements CliAction {
  constructor(private context: CommandContext) {}

  run(): CliResponse {
    const { state, command } = this.context;
    const token = requirePermission(state, "write");
    const event = createEvent(state, token.accountId, command.flags);
    const firstDate = flagString(command.flags, "date");
    const ticket = flagString(command.flags, "ticket");

    state.events.push(event);
    if (firstDate) {
      state.dates.push(createDate(state, event.id, { ...command.flags, starts: firstDate }));
    }
    if (ticket) state.tickets.push(createTicketFromSpec(state, event.id, ticket));

    return commandResponse(command, "Create event", eventView(state, event));
  }
}
