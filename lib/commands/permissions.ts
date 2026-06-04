import { CliError } from "../parser";
import type { AuthStore, Permission } from "../data";

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

type ClassConstructor = new (...args: unknown[]) => object;

const permissionMetadata = new WeakMap<ClassConstructor, Permission[]>();

export function RequiresPermission(...permissions: Permission[]) {
  return function (target: ClassConstructor) {
    permissionMetadata.set(target, permissions);
  };
}

export function getRequiredPermissions(target: ClassConstructor): Permission[] | undefined {
  return permissionMetadata.get(target);
}

export function checkPermissions(target: ClassConstructor, state: AuthStore): void {
  const permissions = getRequiredPermissions(target);
  if (!permissions) return;
  for (const permission of permissions) {
    requirePermission(state, permission);
  }
}
