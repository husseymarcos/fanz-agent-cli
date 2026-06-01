import { requirePermission } from "./auth";
import { CliError } from "./parser";
import { cloneState } from "./responses";
import type { Command } from "./command";
import type { CliResponse, FanzState, Permission } from "../types";

type Mutation = () => unknown;

export function mutate(
  state: FanzState,
  command: Command,
  permission: Permission,
  label: string,
  mutation: Mutation,
): CliResponse {
  requirePermission(state, permission);
  if (permission === "delete" && !command.dryRun && !command.yes) {
    throw new CliError(`${label} is destructive. Re-run with --dry-run or --yes.`, "confirmation_required");
  }

  if (command.dryRun) {
    const snapshot = cloneState(state);
    const preview = mutation();
    Object.assign(state, snapshot);
    return { status: "dry-run", message: `${label} preview; no changes applied.`, data: preview, exitCode: 0 };
  }

  return { status: "ok", message: `${label} completed`, data: mutation(), exitCode: 0 };
}
