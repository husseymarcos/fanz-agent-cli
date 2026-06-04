import { createDate, findEvent } from "../events";
import { requireFlag } from "../../parser";
import { commandResponse } from "../response";
import { RequiresPermission } from "../permissions";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

@RequiresPermission("write")
export class CreateDate implements CliAction {

  run({ state, command }: CommandContext): CliResponse {
    const eventId = requireFlag(command.flags, "event");
    findEvent(state, eventId);
    const date = createDate(state, eventId, command.flags);
    state.dates.push(date);
    return commandResponse(command, "Create date", date);
  }
}
