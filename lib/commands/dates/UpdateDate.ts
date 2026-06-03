import { requirePermission } from "../../auth";
import { applyDateFlags } from "../../events";
import { findById, resourceId } from "../../parser";
import { commandResponse } from "../response";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

export const route = "dates.update";

export class UpdateDate implements CliAction {
  constructor(private context: CommandContext) {}

  run(): CliResponse {
    const { state, command } = this.context;
    requirePermission(state, "write");
    const date = findById(state.dates, resourceId(command), "date");
    applyDateFlags(date, command.flags);
    return commandResponse(command, "Update date", date);
  }
}
