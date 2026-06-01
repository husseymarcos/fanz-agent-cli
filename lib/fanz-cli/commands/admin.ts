import { createInitialState } from "../data";
import { requirePermission } from "../core/auth";
import { CliError } from "../core/parser";
import { ok } from "../core/responses";
import type { Command } from "../core/command";
import type { CliResponse, FanzState } from "../types";

export function audit(state: FanzState, action?: string): CliResponse {
  requirePermission(state, "read");
  if (action !== "list") throw new CliError("Use: fanz audit list");
  return ok("Audit log", state.auditLog.slice(-25));
}

export function reset(state: FanzState, command: Command): CliResponse {
  requirePermission(state, "delete");
  if (!command.yes) throw new CliError("Reset is destructive. Re-run with --yes.", "confirmation_required");
  Object.assign(state, createInitialState());
  return ok("Mock account reset", { version: state.version });
}
