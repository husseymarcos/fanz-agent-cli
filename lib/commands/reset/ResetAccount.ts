import { createInitialState } from "../../data";
import { CliError } from "../../parser";
import { RequiresPermission } from "../permissions";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

@RequiresPermission("delete")
export class ResetAccount implements CliAction {

  run({ state, command }: CommandContext): CliResponse {
    if (!command.yes) {
      throw new CliError("Reset is destructive. Re-run with --yes.", "confirmation_required");
    }
    Object.assign(state, createInitialState());
    return {
      status: "ok",
      message: "Mock account reset",
      data: { version: state.version },
      exitCode: 0,
    };
  }
}
