import { applyDateFlags } from "../events";
import { findById } from "../helpers";
import { commandResponse } from "../response";
import { RequiresPermission } from "../permissions";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

@RequiresPermission("write")
export class UpdateDate implements CliAction {

  run({ state, command }: CommandContext): CliResponse {
    const date = findById(state.dates, command.subject, "date");
    applyDateFlags(date, command.flags);
    return commandResponse(command, "Update date", date);
  }
}
