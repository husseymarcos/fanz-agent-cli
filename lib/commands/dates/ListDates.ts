import { requirePermission } from "../../auth";
import { findEvent } from "../../events";
import { requireEventFlagOrSubject } from "../../parser";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

export class ListDates implements CliAction {
  constructor(private context: CommandContext) {}

  run(): CliResponse {
    const { state, command } = this.context;
    requirePermission(state, "read");
    const eventId = requireEventFlagOrSubject(command);
    findEvent(state, eventId);
    return {
      status: "ok",
      message: "Dates",
      data: state.dates.filter((date) => date.eventId === eventId),
      exitCode: 0,
    };
  }
}
