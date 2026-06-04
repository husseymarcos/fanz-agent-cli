import { findEvent } from "../events";
import { requireEventFlagOrSubject } from "../helpers";
import { RequiresPermission } from "../permissions";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

@RequiresPermission("read")
export class ListDates implements CliAction {

  run({ state, command }: CommandContext): CliResponse {
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
