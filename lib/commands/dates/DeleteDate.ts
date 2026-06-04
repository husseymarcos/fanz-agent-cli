import { CliError, findById, resourceId } from "../../parser";
import { commandResponse } from "../response";
import { RequiresPermission } from "../permissions";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

@RequiresPermission("delete")
export class DeleteDate implements CliAction {

  run({ state, command }: CommandContext): CliResponse {
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
