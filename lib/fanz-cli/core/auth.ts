import { CliError, requireFlag } from "./parser";
import { ok } from "./responses";
import type { AuthToken, CliResponse, FanzState, Permission } from "../types";

export function login(state: FanzState, flags: Record<string, string | boolean>): CliResponse {
  const tokenValue = requireFlag(flags, "token");
  const token = state.tokens.find((candidate) => candidate.token === tokenValue);
  if (!token) {
    throw new CliError(`Invalid mock token "${tokenValue}". Try mock_admin, mock_ops or mock_viewer.`, "auth_error");
  }

  state.activeToken = token.token;
  return ok("Logged in", publicToken(token));
}

export function auth(state: FanzState, action?: string): CliResponse {
  if (action !== "whoami") throw new CliError("Use: fanz auth whoami");
  const token = requireSession(state);
  const account = state.accounts.find((item) => item.id === token.accountId);
  return ok("Active session", { token: publicToken(token), account });
}

export function requireSession(state: FanzState): AuthToken {
  const token = state.tokens.find((item) => item.token === state.activeToken);
  if (!token) throw new CliError("Not logged in. Run: fanz login --token mock_admin", "auth_required");
  return token;
}

export function requirePermission(state: FanzState, permission: Permission): AuthToken {
  const token = requireSession(state);
  if (!token.permissions.includes(permission)) {
    throw new CliError(`Token ${token.token} lacks ${permission} permission.`, "forbidden");
  }
  return token;
}

export function publicToken(token: AuthToken) {
  return {
    token: token.token,
    label: token.label,
    accountId: token.accountId,
    permissions: token.permissions,
  };
}
