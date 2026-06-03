import { createInitialState } from "./data";
import { requirePermission } from "./auth";
import { CliError } from "./parser";
import type { Command } from "./parser";
import type { FanzState } from "./data";
import type { CliResponse } from "./engine";

export function audit(state: FanzState, action?: string): CliResponse {
  requirePermission(state, "read");
  if (action !== "list") throw new CliError("Use: fanz audit list");
  return {
    status: "ok",
    message: "Audit log",
    data: state.auditLog.slice(-25),
    exitCode: 0,
  };
}

export function reset(state: FanzState, command: Command): CliResponse {
  requirePermission(state, "delete");
  if (!command.yes)
    throw new CliError("Reset is destructive. Re-run with --yes.", "confirmation_required");
  Object.assign(state, createInitialState());
  return { status: "ok", message: "Mock account reset", data: { version: state.version }, exitCode: 0 };
}
