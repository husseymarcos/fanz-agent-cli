import type { DiscountData } from ".";
import { CliError, findById, resourceId } from "../../parser";
import { commandResponse } from "../response";
import { RequiresPermission } from "../permissions";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

@RequiresPermission("delete")
export class DeleteDiscount implements CliAction {

  run({ state, command }: CommandContext): CliResponse {
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
