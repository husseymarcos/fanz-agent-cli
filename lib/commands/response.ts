import type { Command } from "../parser";
import type { CliResponse } from "../engine";

export function commandResponse(
  command: Command,
  label: string,
  data: unknown,
): CliResponse {
  if (command.dryRun) {
    return {
      status: "dry-run",
      message: `${label} preview; no changes applied.`,
      data,
      exitCode: 0,
    };
  }

  return { status: "ok", message: `${label} completed`, data, exitCode: 0 };
}
