import { requirePermission } from "../../auth";
import { eventView, findEvent } from "../../events";
import { commandResponse } from "../response";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

export const route = "events.resume";

export class ResumeEvent implements CliAction {
  constructor(private context: CommandContext) {}

  run(): CliResponse {
    const { state, command } = this.context;
    requirePermission(state, "write");
    const event = findEvent(state, command.subject);
    event.status = "on_sale";
    event.updatedAt = new Date().toISOString();
    return commandResponse(command, "Resume event", eventView(state, event));
  }
}
