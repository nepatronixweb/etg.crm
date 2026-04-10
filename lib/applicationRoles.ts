import type { Permission } from "@/types";
import { ROLE_DEFAULT_PERMISSIONS } from "@/lib/utils";

export type ApplicationRoleDef = {
  slug: string;
  label: string;
  defaultPermissions: Permission[];
};

/** Seeded into AppSettings when missing; slugs are referenced by User.role and auth(). */
export const DEFAULT_APPLICATION_ROLES: ApplicationRoleDef[] = [
  { slug: "super_admin", label: "Super Admin", defaultPermissions: [...ROLE_DEFAULT_PERMISSIONS.super_admin] },
  {
    slug: "org_admin",
    label: "Organization admin",
    defaultPermissions: [...ROLE_DEFAULT_PERMISSIONS.org_admin],
  },
  { slug: "counsellor", label: "Counsellor", defaultPermissions: [...ROLE_DEFAULT_PERMISSIONS.counsellor] },
  { slug: "telecaller", label: "Telecaller", defaultPermissions: [...ROLE_DEFAULT_PERMISSIONS.telecaller] },
  { slug: "front_desk", label: "Front Desk", defaultPermissions: [...ROLE_DEFAULT_PERMISSIONS.front_desk] },
  { slug: "application_team", label: "Application Team", defaultPermissions: [...ROLE_DEFAULT_PERMISSIONS.application_team] },
  { slug: "admission_team", label: "Admission Team", defaultPermissions: [...ROLE_DEFAULT_PERMISSIONS.admission_team] },
  { slug: "visa_team", label: "Visa Team", defaultPermissions: [...ROLE_DEFAULT_PERMISSIONS.visa_team] },
  {
    slug: "account_finance",
    label: "Accounts & Finance",
    defaultPermissions: [...ROLE_DEFAULT_PERMISSIONS.account_finance],
  },
];

export function normalizeApplicationRoles(
  raw: unknown
): ApplicationRoleDef[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_APPLICATION_ROLES;
  const out: ApplicationRoleDef[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const slug = String((row as { slug?: string }).slug ?? "").trim().toLowerCase();
    const label = String((row as { label?: string }).label ?? "").trim();
    const perms = (row as { defaultPermissions?: string[] }).defaultPermissions;
    if (!slug || !/^[a-z][a-z0-9_]*$/.test(slug) || !label) continue;
    out.push({
      slug,
      label,
      defaultPermissions: (Array.isArray(perms) ? perms : []) as Permission[],
    });
  }
  if (out.length === 0) return DEFAULT_APPLICATION_ROLES.map((r) => ({
    slug: r.slug,
    label: r.label,
    defaultPermissions: [...r.defaultPermissions],
  }));
  /** New built-in slugs shipped after deploy: append if missing so existing tenants get them without wiping custom catalogs. */
  const MERGE_DEFAULT_SLUGS: readonly string[] = ["account_finance"];
  const seen = new Set(out.map((r) => r.slug));
  for (const slug of MERGE_DEFAULT_SLUGS) {
    if (seen.has(slug)) continue;
    const def = DEFAULT_APPLICATION_ROLES.find((r) => r.slug === slug);
    if (def) {
      out.push({
        slug: def.slug,
        label: def.label,
        defaultPermissions: [...def.defaultPermissions],
      });
    }
  }
  return out;
}

export function isRoleSlugAllowed(slug: string, catalog: ApplicationRoleDef[]): boolean {
  return catalog.some((r) => r.slug === slug);
}

export function resolveDefaultPermissionsForSlug(
  slug: string,
  catalog: ApplicationRoleDef[]
): Permission[] {
  const hit = catalog.find((r) => r.slug === slug);
  if (hit?.defaultPermissions?.length) return [...hit.defaultPermissions];
  const legacy = ROLE_DEFAULT_PERMISSIONS[slug as keyof typeof ROLE_DEFAULT_PERMISSIONS];
  return legacy ? [...legacy] : [];
}
