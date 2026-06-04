import { findEvent } from "../events";
import { requireEventFlagOrSubject } from "../helpers";
import { RequiresPermission } from "../permissions";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

@RequiresPermission("read")
export class ListDiscounts implements CliAction {

  run({ state, command }: CommandContext): CliResponse {
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
