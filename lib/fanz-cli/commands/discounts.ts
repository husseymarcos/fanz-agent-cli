import { requirePermission } from "../core/auth";
import { applyDiscountFlags, createDiscount } from "../catalog/builders";
import { mutate } from "../core/mutations";
import { CliError, requireFlag } from "../core/parser";
import { ok } from "../core/responses";
import { findById, findEvent, requireEventFlagOrSubject, resourceId } from "../core/selectors";
import type { Command } from "../core/command";
import type { CliResponse, FanzState } from "../types";

export function discounts(state: FanzState, command: Command): CliResponse {
  switch (command.action) {
    case "list": {
      requirePermission(state, "read");
      const eventId = requireEventFlagOrSubject(command);
      findEvent(state, eventId);
      return ok("Discounts", state.discounts.filter((discount) => discount.eventId === eventId));
    }
    case "create":
      return mutate(state, command, "write", "Create discount", () => {
        const eventId = requireFlag(command.flags, "event");
        findEvent(state, eventId);
        const discount = createDiscount(state, eventId, command.flags);
        state.discounts.push(discount);
        return discount;
      });
    case "update":
      return mutate(state, command, "write", "Update discount", () => {
        const discount = findById(state.discounts, resourceId(command), "discount");
        applyDiscountFlags(discount, command.flags);
        return discount;
      });
    case "delete":
      return mutate(state, command, "delete", "Delete discount", () => {
        const discount = findById(state.discounts, resourceId(command), "discount");
        if (discount.uses > 0) {
          throw new CliError(`Discount ${discount.id} has ${discount.uses} uses; pause it instead.`, "business_rule");
        }
        state.discounts = state.discounts.filter((item) => item.id !== discount.id);
        return { deleted: discount.id };
      });
    default:
      throw new CliError("Use: fanz discounts list --event EVT_100 | create | update | delete");
  }
}
