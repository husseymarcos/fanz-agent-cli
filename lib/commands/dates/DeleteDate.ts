import { requirePermission } from "../../auth";
import { CliError, findById, resourceId } from "../../parser";
import { commandResponse } from "../response";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

export const route = "dates.delete";

export class DeleteDate implements CliAction {
  constructor(private context: CommandContext) {}

  run(): CliResponse {
    const { state, command } = this.context;
    requirePermission(state, "delete");
    if (!command.dryRun && !command.yes) {
      throw new CliError(
        "Delete date is destructive. Re-run with --dry-run or --yes.",
        "confirmation_required",
      );
    }
    const date = findById(state.dates, resourceId(command), "date");
    state.dates = state.dates.filter((item) => item.id !== date.id);
    return commandResponse(command, "Delete date", { deleted: date.id });
  }
}
