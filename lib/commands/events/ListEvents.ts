import { requirePermission } from "../../auth";
import { eventView } from "../../events";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

export const route = "events.list";

export class ListEvents implements CliAction {
  constructor(private context: CommandContext) {}

  run(): CliResponse {
    const { state } = this.context;
    requirePermission(state, "read");
    return {
      status: "ok",
      message: "Events",
      data: state.events.map((event) => eventView(state, event)),
      exitCode: 0,
    };
  }
}
