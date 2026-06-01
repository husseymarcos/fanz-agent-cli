import { CliError } from "./parser";
import { nextId } from "./ids";
import type { CliResponse, FanzState } from "../types";

export function ok(message: string, data?: unknown): CliResponse {
  return { status: "ok", message, data, exitCode: 0 };
}

export function toErrorResponse(error: unknown): CliResponse {
  if (error instanceof CliError) {
    return {
      status: "error",
      message: error.message,
      data: { code: error.code, details: error.details ?? null },
      exitCode: 1,
    };
  }

  return {
    status: "error",
    message: error instanceof Error ? error.message : "Unknown error",
    exitCode: 1,
  };
}

export function withAudit(state: FanzState, command: string, response: CliResponse): FanzState {
  state.auditLog.push({
    id: nextId(state, "AUD"),
    at: new Date().toISOString(),
    token: state.activeToken,
    command,
    status: response.status,
    message: response.message,
  });
  return state;
}

export function cloneState(state: FanzState): FanzState {
  return structuredClone(state);
}
