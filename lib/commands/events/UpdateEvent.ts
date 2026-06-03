import { requirePermission } from "../../auth";
import { applyEventFlags, eventView, findEvent } from "../../events";
import { commandResponse } from "../response";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

export class UpdateEvent implements CliAction {
  constructor(private context: CommandContext) {}

  run(): CliResponse {
    const { state, command } = this.context;
    requirePermission(state, "write");
    const event = findEvent(state, command.subject);
    applyEventFlags(event, command.flags);
    event.updatedAt = new Date().toISOString();
    return commandResponse(command, "Update event", eventView(state, event));
  }
}
