import { requirePermission } from "../../auth";
import { createDate, findEvent } from "../../events";
import { requireFlag } from "../../parser";
import { commandResponse } from "../response";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

export const route = "dates.create";

export class CreateDate implements CliAction {
  constructor(private context: CommandContext) {}

  run(): CliResponse {
    const { state, command } = this.context;
    requirePermission(state, "write");
    const eventId = requireFlag(command.flags, "event");
    findEvent(state, eventId);
    const date = createDate(state, eventId, command.flags);
    state.dates.push(date);
    return commandResponse(command, "Create date", date);
  }
}
