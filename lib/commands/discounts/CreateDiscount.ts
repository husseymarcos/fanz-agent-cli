import { requirePermission } from "../../auth";
import { createDiscount } from "../../discounts";
import { findEvent } from "../../events";
import { requireFlag } from "../../parser";
import { commandResponse } from "../response";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

export const route = "discounts.create";

export class CreateDiscount implements CliAction {
  constructor(private context: CommandContext) {}

  run(): CliResponse {
    const { state, command } = this.context;
    requirePermission(state, "write");
    const eventId = requireFlag(command.flags, "event");
    findEvent(state, eventId);
    const discount = createDiscount(state, eventId, command.flags);
    state.discounts.push(discount);
    return commandResponse(command, "Create discount", discount);
  }
}
