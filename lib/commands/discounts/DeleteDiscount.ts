import { requirePermission } from "../../auth";
import type { DiscountData } from "../../discounts";
import { CliError, findById, resourceId } from "../../parser";
import { commandResponse } from "../response";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

export const route = "discounts.delete";

export class DeleteDiscount implements CliAction {
  constructor(private context: CommandContext) {}

  run(): CliResponse {
    const { state, command } = this.context;
    requirePermission(state, "delete");
    if (!command.dryRun && !command.yes) {
      throw new CliError(
        "Delete discount is destructive. Re-run with --dry-run or --yes.",
        "confirmation_required",
      );
    }
    const discount = findById(state.discounts, resourceId(command), "discount");
    if (discount.uses > 0) {
      throw new CliError(
        `Discount ${discount.id} has ${discount.uses} uses; pause it instead.`,
        "business_rule",
      );
    }
    state.discounts = state.discounts.filter((item: DiscountData) => item.id !== discount.id);
    return commandResponse(command, "Delete discount", { deleted: discount.id });
  }
}
