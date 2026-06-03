import { CliError } from "./parser";
import type { AuthStore, Permission } from "./data";

export function requireSession(authStore: AuthStore) {
  const token = authStore.tokens.find((item) => item.token === authStore.activeToken);
  if (!token) {
    throw new CliError(
      "Not logged in. Run: fanz login --token mock_admin",
      "auth_required",
    );
  }
  return token;
}

export function requirePermission(
  authStore: AuthStore,
  permission: Permission,
) {
  const token = requireSession(authStore);
  if (!token.permissions.includes(permission)) {
    throw new CliError(
      `Token ${token.token} lacks ${permission} permission.`,
      "forbidden",
    );
  }
  return token;
}
