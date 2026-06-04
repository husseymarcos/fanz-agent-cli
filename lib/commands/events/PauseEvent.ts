import { eventView, findEvent } from ".";
import { commandResponse } from "../response";
import { RequiresPermission } from "../permissions";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

@RequiresPermission("write")
export class PauseEvent implements CliAction {

  run({ state, command }: CommandContext): CliResponse {
    const event = findEvent(state, command.subject);
    event.status = "paused";
    event.updatedAt = new Date().toISOString();
    return commandResponse(command, "Pause event", eventView(state, event));
  }
}
