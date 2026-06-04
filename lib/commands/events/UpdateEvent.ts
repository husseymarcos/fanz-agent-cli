import { applyEventFlags, eventView, findEvent } from ".";
import { commandResponse } from "../response";
import { RequiresPermission } from "../permissions";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

@RequiresPermission("write")
export class UpdateEvent implements CliAction {

  run({ state, command }: CommandContext): CliResponse {
    const event = findEvent(state, command.subject);
    applyEventFlags(event, command.flags);
    event.updatedAt = new Date().toISOString();
    return commandResponse(command, "Update event", eventView(state, event));
  }
}
