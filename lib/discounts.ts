import { nextId } from "./data";
import { CliError, flagNumber, flagString, requireFlag } from "./parser";
import type { DiscountStore, IdStore } from "./data";

export type DiscountStatus = "active" | "paused" | "expired";

export type DiscountData = {
  id: string;
  eventId: string;
  code: string;
  percent: number;
  maxUses?: number;
  uses: number;
  status: DiscountStatus;
};

export function createDiscount(
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

export function applyDiscountFlags(
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

function parseDiscountStatus(value?: string): DiscountStatus {
  const allowed: DiscountStatus[] = ["active", "paused", "expired"];
  if (allowed.includes(value as DiscountStatus)) return value as DiscountStatus;
  throw new CliError(
    `Invalid discount status "${value}". Allowed: ${allowed.join(", ")}`,
    "validation_error",
  );
}
