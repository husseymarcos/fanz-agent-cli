import { requirePermission } from "./auth";
import { nextId } from "./data";
import { CliError, flagNumber, flagString, requireFlag, findById, resourceId } from "./parser";
import type { Command } from "./parser";
import type { FanzState } from "./data";
import type { CliResponse } from "./engine";
import { findEvent } from "./events";

export type DiscountStatus = "active" | "paused" | "expired";

export type Discount = {
  id: string;
  eventId: string;
  code: string;
  percent: number;
  maxUses?: number;
  uses: number;
  status: DiscountStatus;
};

export function discounts(state: FanzState, command: Command): CliResponse {
  switch (command.action) {
    case "list": {
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
    case "create": {
      requirePermission(state, "write");
      if (command.dryRun) {
        const snapshot = structuredClone(state);
        const eventId = requireFlag(command.flags, "event");
        findEvent(state, eventId);
        const discount = createDiscount(state, eventId, command.flags);
        state.discounts.push(discount);
        const preview = discount;
        Object.assign(state, snapshot);
        return {
          status: "dry-run",
          message: "Create discount preview; no changes applied.",
          data: preview,
          exitCode: 0,
        };
      }
      const eventId = requireFlag(command.flags, "event");
      findEvent(state, eventId);
      const discount = createDiscount(state, eventId, command.flags);
      state.discounts.push(discount);
      return {
        status: "ok",
        message: "Create discount completed",
        data: discount,
        exitCode: 0,
      };
    }
    case "update": {
      requirePermission(state, "write");
      if (command.dryRun) {
        const snapshot = structuredClone(state);
        const discount = findById(state.discounts, resourceId(command), "discount");
        applyDiscountFlags(discount, command.flags);
        const preview = discount;
        Object.assign(state, snapshot);
        return {
          status: "dry-run",
          message: "Update discount preview; no changes applied.",
          data: preview,
          exitCode: 0,
        };
      }
      const discount = findById(state.discounts, resourceId(command), "discount");
      applyDiscountFlags(discount, command.flags);
      return {
        status: "ok",
        message: "Update discount completed",
        data: discount,
        exitCode: 0,
      };
    }
    case "delete": {
      requirePermission(state, "delete");
      if (!command.dryRun && !command.yes) {
        throw new CliError(
          "Delete discount is destructive. Re-run with --dry-run or --yes.",
          "confirmation_required",
        );
      }
      if (command.dryRun) {
        const snapshot = structuredClone(state);
        const discount = findById(state.discounts, resourceId(command), "discount");
        if (discount.uses > 0) {
          throw new CliError(
            `Discount ${discount.id} has ${discount.uses} uses; pause it instead.`,
            "business_rule",
          );
        }
        state.discounts = state.discounts.filter((item) => item.id !== discount.id);
        const preview = { deleted: discount.id };
        Object.assign(state, snapshot);
        return {
          status: "dry-run",
          message: "Delete discount preview; no changes applied.",
          data: preview,
          exitCode: 0,
        };
      }
      const discount = findById(state.discounts, resourceId(command), "discount");
      if (discount.uses > 0) {
        throw new CliError(
          `Discount ${discount.id} has ${discount.uses} uses; pause it instead.`,
          "business_rule",
        );
      }
      state.discounts = state.discounts.filter((item) => item.id !== discount.id);
      return {
        status: "ok",
        message: "Delete discount completed",
        data: { deleted: discount.id },
        exitCode: 0,
      };
    }
    default:
      throw new CliError(
        "Use: fanz discounts list --event EVT_100 | create | update | delete",
      );
  }
}

export function createDiscount(
  state: FanzState,
  eventId: string,
  flags: Record<string, string | boolean>,
): Discount {
  const code = requireFlag(flags, "code").toUpperCase();
  if (state.discounts.some((discount) => discount.eventId === eventId && discount.code === code)) {
    throw new CliError(`Discount code ${code} already exists for ${eventId}.`, "business_rule");
  }

  const percent = flagNumber(flags, "percent");
  if (percent === undefined || percent <= 0 || percent > 100) {
    throw new CliError("--percent must be between 1 and 100", "validation_error");
  }

  return {
    id: nextId(state, "DSC"),
    eventId,
    code,
    percent,
    maxUses: flagNumber(flags, "max-uses"),
    uses: 0,
    status: parseDiscountStatus(flagString(flags, "status", "active")),
  };
}

export function applyDiscountFlags(
  discount: Discount,
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

function requireEventFlagOrSubject(command: Command): string {
  return (
    flagString(command.flags, "event", command.subject) ??
    (() => {
      throw new CliError(
        "Missing event id. Use --event EVT_100 or pass it after the action.",
        "validation_error",
      );
    })()
  );
}
