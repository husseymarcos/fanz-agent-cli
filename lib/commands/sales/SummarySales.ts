import { buildEventSummary } from "../events";
import { findEvent } from "../events";
import { requireEventFlagOrSubject } from "../../parser";
import { RequiresPermission } from "../permissions";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

@RequiresPermission("read")
export class SummarySales implements CliAction {

  run({ state, command }: CommandContext): CliResponse {
    const eventId = requireEventFlagOrSubject(command);
    findEvent(state, eventId);
    return {
      status: "ok",
      message: "Sales summary",
      data: buildEventSummary(state, eventId),
      exitCode: 0,
    };
  }
}
