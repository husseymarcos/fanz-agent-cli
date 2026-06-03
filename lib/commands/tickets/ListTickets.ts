import { requirePermission } from "../../auth";
import { requireEventFlagOrSubject } from "../../parser";
import { findEvent, ticketView } from "../../tickets";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

export const route = "tickets.list";

export class ListTickets implements CliAction {
  constructor(private context: CommandContext) {}

  run(): CliResponse {
    const { state, command } = this.context;
    requirePermission(state, "read");
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
