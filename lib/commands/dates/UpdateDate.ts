import { applyDateFlags } from "../events";
import { findById, resourceId } from "../../parser";
import { commandResponse } from "../response";
import { RequiresPermission } from "../permissions";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

@RequiresPermission("write")
export class UpdateDate implements CliAction {

  run({ state, command }: CommandContext): CliResponse {
    const date = findById(state.dates, resourceId(command), "date");
    applyDateFlags(date, command.flags);
    return commandResponse(command, "Update date", date);
  }
}
