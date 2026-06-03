import { requirePermission } from "../../auth";
import { ensureNoPaidOrders, findEvent } from "../../events";
import { CliError } from "../../parser";
import { commandResponse } from "../response";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

export class DeleteEvent implements CliAction {
  constructor(private context: CommandContext) {}

  run(): CliResponse {
    const { state, command } = this.context;
    requirePermission(state, "delete");
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
