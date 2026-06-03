import { requirePermission } from "../../auth";
import { buildEventSummary } from "../../events";
import { findEvent } from "../../events";
import { requireEventFlagOrSubject } from "../../parser";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

export class SummarySales implements CliAction {
  constructor(private context: CommandContext) {}

  run(): CliResponse {
    const { state, command } = this.context;
    requirePermission(state, "read");
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
