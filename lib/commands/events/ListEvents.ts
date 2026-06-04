import { eventView } from ".";
import { RequiresPermission } from "../permissions";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

@RequiresPermission("read")
export class ListEvents implements CliAction {

  run({ state }: CommandContext): CliResponse {
    return {
      status: "ok",
      message: "Events",
      data: state.events.map((event) => eventView(state, event)),
      exitCode: 0,
    };
  }
}
