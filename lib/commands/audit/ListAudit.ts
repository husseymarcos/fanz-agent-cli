import { RequiresPermission } from "../permissions";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

@RequiresPermission("read")
export class ListAudit implements CliAction {

  run({ state }: CommandContext): CliResponse {
    return {
      status: "ok",
      message: "Audit log",
      data: state.auditLog.slice(-25),
      exitCode: 0,
    };
  }
}
