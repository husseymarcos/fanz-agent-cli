import type { TicketData } from ".";
import { CliError, findById, resourceId } from "../../parser";
import { commandResponse } from "../response";
import { RequiresPermission } from "../permissions";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

@RequiresPermission("delete")
export class DeleteTicket implements CliAction {

  run({ state, command }: CommandContext): CliResponse {
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
