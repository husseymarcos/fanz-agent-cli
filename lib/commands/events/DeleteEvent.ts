import { findEvent } from ".";
import { CliError } from "../../parser";
import { commandResponse } from "../response";
import { RequiresPermission } from "../permissions";
import type { CliAction, CliResponse, CommandContext } from "../../engine";
import type { EventData } from ".";
import type { EventStore, OrderStore } from "../../data";

function assertEventCanDelete(store: OrderStore, event: EventData) {
  const paid = store.orders.filter(
    (order) => order.eventId === event.id && order.status === "paid",
  );
  if (paid.length > 0) {
    throw new CliError(
      `Event ${event.id} has ${paid.length} paid orders; pause it instead of deleting.`,
      "business_rule",
    );
  }
}

function ensureNoPaidOrders(store: EventStore & OrderStore, eventId: string) {
  assertEventCanDelete(store, findEvent(store, eventId));
}

@RequiresPermission("delete")
export class DeleteEvent implements CliAction {

  run({ state, command }: CommandContext): CliResponse {
    if (!command.dryRun && !command.yes) {
      throw new CliError(
        "Delete event is destructive. Re-run with --dry-run or --yes.",
        "confirmation_required",
      );
    }
    const event = findEvent(state, command.subject);
    ensureNoPaidOrders(state, event.id);
    state.events = state.events.filter((item) => item.id !== event.id);
    state.dates = state.dates.filter((item) => item.eventId !== event.id);
    state.tickets = state.tickets.filter((item) => item.eventId !== event.id);
    state.discounts = state.discounts.filter((item) => item.eventId !== event.id);
    return commandResponse(command, "Delete event", { deleted: event.id });
  }
}
