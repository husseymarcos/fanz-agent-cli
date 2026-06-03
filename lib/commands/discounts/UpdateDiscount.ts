import { requirePermission } from "../../auth";
import { applyDiscountFlags } from "../../discounts";
import { findById, resourceId } from "../../parser";
import { commandResponse } from "../response";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

export class UpdateDiscount implements CliAction {
  constructor(private context: CommandContext) {}

  run(): CliResponse {
    const { state, command } = this.context;
    requirePermission(state, "write");
    const discount = findById(state.discounts, resourceId(command), "discount");
    applyDiscountFlags(discount, command.flags);
    return commandResponse(command, "Update discount", discount);
  }
}
