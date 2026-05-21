import type { ApplicationRoleDef } from "@/lib/applicationRoles";

/** Roles that must not be combined with any other role. */
export const SOLO_USER_ROLES = new Set(["super_admin"]);

export const MAX_USER_ROLES = 4;

export type UserRoleRow = {
  role?: string;
  roles?: string[] | null;
  activeRole?: string | null;
};

/** Union of `roles[]` and legacy `role` — matches auth session normalization. */
export function resolveUserRoles(user: UserRoleRow): string[] {
  const fromArray = Array.isArray(user.roles)
    ? user.roles.map((r) => String(r).trim()).filter(Boolean)
    : [];
  const legacy = String(user.role ?? "").trim();
  return Array.from(new Set([...fromArray, ...(legacy ? [legacy] : [])]));
}

export function resolvePrimaryRole(user: UserRoleRow): string {
  const roles = resolveUserRoles(user);
  const stored = String(user.role ?? "").trim();
  if (stored && roles.includes(stored)) return stored;
  return roles[0] || "counsellor";
}

/** Current session hat; falls back to login primary. */
export function resolveEffectiveRole(user: UserRoleRow): string {
  const roles = resolveUserRoles(user);
  const active = String(user.activeRole ?? "").trim();
  if (active && roles.includes(active)) return active;
  return resolvePrimaryRole(user);
}

export function userHasRole(user: UserRoleRow, slug: string): boolean {
  return resolveUserRoles(user).includes(slug);
}

export function mergeDefaultPermissionsForRoles(
  roleSlugs: string[],
  getDefaultsForSlug: (slug: string) => string[]
): string[] {
  const merged = new Set<string>();
  for (const slug of roleSlugs) {
    for (const p of getDefaultsForSlug(slug)) merged.add(p);
  }
  return Array.from(merged);
}

export function permissionSetsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  for (const x of b) if (!sa.has(x)) return false;
  return true;
}

/** Prefer these when picking default role for new team members. */
export const PREFERRED_OPERATIONAL_ROLES = [
  "counsellor",
  "telecaller",
  "front_desk",
  "application_team",
] as const;

export function pickDefaultCreatableRole(availableSlugs: string[]): string {
  const set = new Set(availableSlugs);
  for (const slug of PREFERRED_OPERATIONAL_ROLES) {
    if (set.has(slug)) return slug;
  }
  const nonSolo = availableSlugs.find((s) => !SOLO_USER_ROLES.has(s));
  return nonSolo ?? availableSlugs[0] ?? "counsellor";
}

export function validateUserRolesSelection(roleSlugs: string[]): string | null {
  const roles = Array.from(new Set(roleSlugs.map((r) => String(r).trim()).filter(Boolean)));
  if (roles.length === 0) return "At least one role is required.";
  if (roles.length > MAX_USER_ROLES) return `A user can have at most ${MAX_USER_ROLES} roles.`;
  const solo = roles.filter((r) => SOLO_USER_ROLES.has(r));
  if (solo.length > 0 && roles.length > 1) {
    return `${solo[0]} cannot be combined with other roles.`;
  }
  return null;
}

export type RoleToggleResult = {
  roles: string[];
  /** False when at cap and trying to add — caller should no-op UI. */
  changed: boolean;
};

/**
 * Single source of truth for role chip toggling (UI + tests).
 * Always returns at least one role when `availableSlugs` is non-empty.
 */
export function toggleUserRolesSelection(
  current: string[],
  slug: string,
  availableSlugs: string[]
): RoleToggleResult {
  const selected = current.length > 0 ? [...current] : [];

  if (slug === "super_admin") {
    if (selected.includes("super_admin")) {
      if (selected.length === 1) {
        const fallback = pickDefaultCreatableRole(availableSlugs.filter((r) => r !== "super_admin"));
        return { roles: [fallback], changed: true };
      }
      return { roles: selected.filter((r) => r !== "super_admin"), changed: true };
    }
    return { roles: ["super_admin"], changed: true };
  }

  let next = selected.filter((r) => r !== "super_admin");

  if (next.includes(slug)) {
    next = next.filter((r) => r !== slug);
    if (next.length === 0) {
      next = [slug];
    }
    return { roles: next, changed: true };
  }

  if (next.length >= MAX_USER_ROLES) {
    return { roles: selected, changed: false };
  }

  next = [...next, slug];
  return { roles: next, changed: true };
}

export function resolvePrimaryFromSelection(roles: string[], currentPrimary: string): string {
  if (roles.includes(currentPrimary)) return currentPrimary;
  return roles[0] ?? currentPrimary;
}

/** @deprecated Use toggleUserRolesSelection */
export function toggleRoleInSelection(
  current: string[],
  slug: string,
  options?: { maxRoles?: number }
): string[] {
  void options;
  return toggleUserRolesSelection(current, slug, current.length ? current : [slug]).roles;
}

export function roleCatalogLabel(slug: string, catalog: ApplicationRoleDef[]): string {
  return catalog.find((r) => r.slug === slug)?.label ?? slug.replace(/_/g, " ");
}

export function rolesIncludeSuperAdmin(roles: string[]): boolean {
  return roles.some((r) => r === "super_admin");
}
