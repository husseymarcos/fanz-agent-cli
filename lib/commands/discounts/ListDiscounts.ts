import { requirePermission } from "../../auth";
import { findEvent } from "../../events";
import { requireEventFlagOrSubject } from "../../parser";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

export class ListDiscounts implements CliAction {
  constructor(private context: CommandContext) {}

  run(): CliResponse {
    const { state, command } = this.context;
    requirePermission(state, "read");
    const eventId = requireEventFlagOrSubject(command);
    findEvent(state, eventId);
    return {
      status: "ok",
      message: "Discounts",
      data: state.discounts.filter((discount) => discount.eventId === eventId),
      exitCode: 0,
    };
  }
}
