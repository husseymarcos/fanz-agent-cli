import { requireEventFlagOrSubject } from "../helpers";
import { findEvent, ticketView } from ".";
import { RequiresPermission } from "../permissions";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

@RequiresPermission("read")
export class ListTickets implements CliAction {

  run({ state, command }: CommandContext): CliResponse {
    const eventId = requireEventFlagOrSubject(command);
    findEvent(state, eventId);
    return {
      status: "ok",
      message: "Tickets",
      data: state.tickets.filter((ticket) => ticket.eventId === eventId).map(ticketView),
      exitCode: 0,
    };
  }
}
