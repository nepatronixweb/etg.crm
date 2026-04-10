/** Platform operator — full system, no tenant boundary. */
export function isPlatformSuperAdmin(role: string | undefined): boolean {
  return role === "super_admin";
}

/** Tenant owner — same modules as super_admin within their organization only. */
export function isOrgAdmin(role: string | undefined): boolean {
  return role === "org_admin";
}

/** Bypass disabled-module nav / enquiries extras (not used for data APIs). */
export function isOrgWideAdmin(role: string | undefined): boolean {
  return isPlatformSuperAdmin(role) || isOrgAdmin(role);
}
