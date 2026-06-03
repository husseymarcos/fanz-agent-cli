import { requirePermission } from "../../auth";
import { CliError, findById, resourceId } from "../../parser";
import type { TicketData } from "../../tickets";
import { commandResponse } from "../response";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

export class DeleteTicket implements CliAction {
  constructor(private context: CommandContext) {}

  run(): CliResponse {
    const { state, command } = this.context;
    requirePermission(state, "delete");
    if (!command.dryRun && !command.yes) {
      throw new CliError(
        "Delete ticket is destructive. Re-run with --dry-run or --yes.",
        "confirmation_required",
      );
    }
    const ticket = findById(state.tickets, resourceId(command), "ticket");
    if (ticket.sold > 0) {
      throw new CliError(
        `Ticket ${ticket.id} has ${ticket.sold} sold units; pause it instead.`,
        "business_rule",
      );
    }
    state.tickets = state.tickets.filter((item: TicketData) => item.id !== ticket.id);
    return commandResponse(command, "Delete ticket", { deleted: ticket.id });
  }
}
