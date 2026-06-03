import { CliError, requireFlag } from "./parser";
import type { FanzState } from "./data";
import type { CliResponse } from "./engine";

export function login(
  state: FanzState,
  flags: Record<string, string | boolean>,
): CliResponse {
  const tokenValue = requireFlag(flags, "token");
  const token = state.tokens.find((candidate) => candidate.token === tokenValue);
  if (!token) {
    throw new CliError(
      `Invalid mock token "${tokenValue}". Try mock_admin, mock_ops or mock_viewer.`,
      "auth_error",
    );
  }

  state.activeToken = token.token;
  return {
    status: "ok",
    message: "Logged in",
    data: publicToken(token),
    exitCode: 0,
  };
}

export function auth(state: FanzState, action?: string): CliResponse {
  if (action !== "whoami") throw new CliError("Use: fanz auth whoami");
  const token = requireSession(state);
  const account = state.accounts.find((item) => item.id === token.accountId);
  return {
    status: "ok",
    message: "Active session",
    data: { token: publicToken(token), account },
    exitCode: 0,
  };
}

export function requireSession(state: FanzState) {
  const token = state.tokens.find((item) => item.token === state.activeToken);
  if (!token) {
    throw new CliError(
      "Not logged in. Run: fanz login --token mock_admin",
      "auth_required",
    );
  }
  return token;
}

export function requirePermission(
  state: FanzState,
  permission: "read" | "write" | "delete" | "export" | "resend",
) {
  const token = requireSession(state);
  if (!token.permissions.includes(permission)) {
    throw new CliError(
      `Token ${token.token} lacks ${permission} permission.`,
      "forbidden",
    );
  }
  return token;
}

function publicToken(token: NonNullable<ReturnType<typeof requireSession>>) {
  return {
    token: token.token,
    label: token.label,
    accountId: token.accountId,
    permissions: token.permissions,
  };
}
