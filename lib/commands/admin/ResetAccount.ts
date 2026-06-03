import { requirePermission } from "../../auth";
import { createInitialState } from "../../data";
import { CliError } from "../../parser";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

export const route = "reset";

export class ResetAccount implements CliAction {
  constructor(private context: CommandContext) {}

  run(): CliResponse {
    const { state, command } = this.context;
    requirePermission(state, "delete");
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
