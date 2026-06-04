import { nextId } from "../../data";
import { CliError } from "../../parser";
import { flagNumber, flagString, requireFlag } from "../../flags";
import type { DiscountStore, IdStore } from "../../data";
import type { DiscountData } from "./index";
import { findEvent } from "../events";
import { commandResponse } from "../response";
import { RequiresPermission } from "../permissions";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

type DiscountStatus = DiscountData["status"];

function parseDiscountStatus(value?: string): DiscountStatus {
  const allowed: DiscountStatus[] = ["active", "paused", "expired"];
  if (allowed.includes(value as DiscountStatus)) return value as DiscountStatus;
  throw new CliError(
    `Invalid discount status "${value}". Allowed: ${allowed.join(", ")}`,
    "validation_error",
  );
}

function createDiscount(
  store: DiscountStore & IdStore,
  eventId: string,
  flags: Record<string, string | boolean>,
): DiscountData {
  const code = requireFlag(flags, "code").toUpperCase();
  if (store.discounts.some((discount) => discount.eventId === eventId && discount.code === code)) {
    throw new CliError(`Discount code ${code} already exists for ${eventId}.`, "business_rule");
  }

  const percent = flagNumber(flags, "percent");
  if (percent === undefined || percent <= 0 || percent > 100) {
    throw new CliError("--percent must be between 1 and 100", "validation_error");
  }

  return {
    id: nextId(store, "DSC"),
    eventId,
    code,
    percent,
    maxUses: flagNumber(flags, "max-uses"),
    uses: 0,
    status: parseDiscountStatus(flagString(flags, "status", "active")),
  };
}

@RequiresPermission("write")
export class CreateDiscount implements CliAction {

  run({ state, command }: CommandContext): CliResponse {
    const eventId = requireFlag(command.flags, "event");
    findEvent(state, eventId);
    const discount = createDiscount(state, eventId, command.flags);
    state.discounts.push(discount);
    return commandResponse(command, "Create discount", discount);
  }
}
