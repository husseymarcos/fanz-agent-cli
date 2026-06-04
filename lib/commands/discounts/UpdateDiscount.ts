import { CliError } from "../../parser";
import { flagNumber, flagString } from "../../flags";
import { findById } from "../helpers";
import type { DiscountData } from "./index";
import { commandResponse } from "../response";
import { RequiresPermission } from "../permissions";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

@RequiresPermission("write")
export class UpdateDiscount implements CliAction {
  run({ state, command }: CommandContext): CliResponse {
    const discount = findById(state.discounts, command.subject, "discount");
    applyDiscountFlags(discount, command.flags);
    return commandResponse(command, "Update discount", discount);
  }
}

type DiscountStatus = DiscountData["status"];

function parseDiscountStatus(value?: string): DiscountStatus {
  const allowed: DiscountStatus[] = ["active", "paused", "expired"];
  if (allowed.includes(value as DiscountStatus)) return value as DiscountStatus;
  throw new CliError(
    `Invalid discount status "${value}". Allowed: ${allowed.join(", ")}`,
    "validation_error",
  );
}

function applyDiscountFlags(
  discount: DiscountData,
  flags: Record<string, string | boolean>,
) {
  discount.code = flagString(flags, "code", discount.code)?.toUpperCase() ?? discount.code;
  const percent = flagNumber(flags, "percent", discount.percent);
  if (percent === undefined || percent <= 0 || percent > 100) {
    throw new CliError("--percent must be between 1 and 100", "validation_error");
  }
  discount.percent = percent;
  discount.maxUses = flagNumber(flags, "max-uses", discount.maxUses);
  discount.status = parseDiscountStatus(flagString(flags, "status", discount.status));
}
