import { requirePermission } from "../../auth";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

export class ListAudit implements CliAction {
  constructor(private context: CommandContext) {}

  run(): CliResponse {
    const { state } = this.context;
    requirePermission(state, "read");
    return {
      status: "ok",
      message: "Audit log",
      data: state.auditLog.slice(-25),
      exitCode: 0,
    };
  }
}
