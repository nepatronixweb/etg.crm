"use client";

import { Check, Shield, Info } from "lucide-react";
import type { ApplicationRoleDef } from "@/lib/applicationRoles";
import { getRoleBadgeColor, getRoleLabel, ALL_PERMISSIONS } from "@/lib/utils";
import {
  MAX_USER_ROLES,
  mergeDefaultPermissionsForRoles,
  roleCatalogLabel,
  toggleUserRolesSelection,
  resolvePrimaryFromSelection,
  resolveUserRoles,
  resolvePrimaryRole,
  resolveEffectiveRole,
} from "@/lib/userRoles";

const roleIconMap: Record<string, string> = {
  super_admin: "text-red-500",
  counsellor: "text-blue-500",
  telecaller: "text-green-500",
  application_team: "text-purple-500",
  admission_team: "text-yellow-600",
  visa_team: "text-orange-500",
  front_desk: "text-gray-500",
  account_finance: "text-teal-600",
  org_admin: "text-indigo-600",
};

type UserRolesFormSectionProps = {
  availableRoles: string[];
  applicationRoles: ApplicationRoleDef[];
  selectedRoles: string[];
  primaryRole: string;
  permissions: string[];
  customPermissions: boolean;
  defaultPermissionsForSlug: (slug: string) => string[];
  onRolesChange: (roles: string[], primaryRole: string, permissions: string[], customPermissions: boolean) => void;
  onCustomPermissionsChange: (custom: boolean) => void;
};

function RoleChip({
  slug,
  applicationRoles,
  selected,
  disabled,
  disabledReason,
  onToggle,
}: {
  slug: string;
  applicationRoles: ApplicationRoleDef[];
  selected: boolean;
  disabled: boolean;
  disabledReason?: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      title={disabledReason ?? roleCatalogLabel(slug, applicationRoles)}
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
        selected
          ? `${getRoleBadgeColor(slug)} ring-2 ring-offset-1 ring-blue-400/80 shadow-sm`
          : disabled
            ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
            : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer"
      }`}
    >
      <Shield size={13} className={selected ? "" : roleIconMap[slug] ?? "text-gray-500"} />
      {getRoleLabel(slug, applicationRoles)}
      {selected && <Check size={12} className="opacity-90 shrink-0" />}
    </button>
  );
}

export default function UserRolesFormSection({
  availableRoles,
  applicationRoles,
  selectedRoles,
  primaryRole,
  permissions,
  customPermissions,
  defaultPermissionsForSlug,
  onRolesChange,
  onCustomPermissionsChange,
}: UserRolesFormSectionProps) {
  const mergedDefaults = mergeDefaultPermissionsForRoles(selectedRoles, defaultPermissionsForSlug);

  const adminRoles = availableRoles.filter((s) => s === "super_admin" || s === "org_admin");
  const teamRoles = availableRoles.filter((s) => s !== "super_admin" && s !== "org_admin");

  const hasSuperAdmin = selectedRoles.includes("super_admin");
  const selectedCount = selectedRoles.length;

  const applyRoles = (next: string[], nextPrimary?: string) => {
    if (next.length === 0) return;
    const primary = resolvePrimaryFromSelection(next, nextPrimary ?? primaryRole);
    const nextPerms = customPermissions ? permissions : mergeDefaultPermissionsForRoles(next, defaultPermissionsForSlug);
    onRolesChange(next, primary, nextPerms, customPermissions);
  };

  const toggleRole = (slug: string) => {
    const { roles: next, changed } = toggleUserRolesSelection(selectedRoles, slug, availableRoles);
    if (!changed) return;
    applyRoles(next);
  };

  const setPrimary = (slug: string) => {
    if (!selectedRoles.includes(slug)) return;
    onRolesChange(selectedRoles, slug, permissions, customPermissions);
  };

  const syncFromRoles = () => {
    onCustomPermissionsChange(false);
    onRolesChange(
      selectedRoles,
      primaryRole,
      mergeDefaultPermissionsForRoles(selectedRoles, defaultPermissionsForSlug),
      false
    );
  };

  const previewModules = ALL_PERMISSIONS.filter((p) => permissions.includes(p.key)).map((p) => p.label);

  const chipDisabled = (slug: string, selected: boolean) => {
    if (selected) return { disabled: false as const };
    if (hasSuperAdmin) {
      return { disabled: true as const, reason: "Deselect Super Admin first to assign other roles" };
    }
    if (selectedCount >= MAX_USER_ROLES) {
      return { disabled: true as const, reason: `Maximum ${MAX_USER_ROLES} roles — deselect one to add another` };
    }
    return { disabled: false as const };
  };

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Roles</h3>
        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
          Click roles to add or remove them (up to {MAX_USER_ROLES}). Organization admin can be combined with team roles.
          Only <strong className="text-gray-800">Super Admin</strong> must be assigned alone. Members with multiple
          roles switch their active role from the header after login.
        </p>
      </div>

      {hasSuperAdmin && (
        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <Info size={14} className="shrink-0 mt-0.5" />
          <span>
            Super Admin is exclusive. Click <strong>Super Admin</strong> again to switch back to team roles.
          </span>
        </div>
      )}

      {adminRoles.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Administrative</p>
          <div className="flex flex-wrap gap-2">
            {adminRoles.map((slug) => {
              const selected = selectedRoles.includes(slug);
              const { disabled, reason } = chipDisabled(slug, selected);
              return (
                <RoleChip
                  key={slug}
                  slug={slug}
                  applicationRoles={applicationRoles}
                  selected={selected}
                  disabled={disabled}
                  disabledReason={reason}
                  onToggle={() => toggleRole(slug)}
                />
              );
            })}
          </div>
        </div>
      )}

      {teamRoles.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
            Team roles {selectedCount > 0 && !hasSuperAdmin ? `( ${selectedCount} / ${MAX_USER_ROLES} selected )` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {teamRoles.map((slug) => {
              const selected = selectedRoles.includes(slug);
              const { disabled, reason } = chipDisabled(slug, selected);
              return (
                <RoleChip
                  key={slug}
                  slug={slug}
                  applicationRoles={applicationRoles}
                  selected={selected}
                  disabled={disabled}
                  disabledReason={reason}
                  onToggle={() => toggleRole(slug)}
                />
              );
            })}
          </div>
        </div>
      )}

      {selectedRoles.length > 1 && (
        <div>
          <label htmlFor="user-form-primary-role" className="block text-xs font-semibold text-gray-700 mb-1.5">
            Primary role (default on login)
          </label>
          <select
            id="user-form-primary-role"
            value={primaryRole}
            onChange={(e) => setPrimary(e.target.value)}
            className="w-full sm:max-w-xs px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            {selectedRoles.map((slug) => (
              <option key={slug} value={slug}>
                {getRoleLabel(slug, applicationRoles)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3">
        <p className="text-xs font-semibold text-blue-900 mb-2">Access from selected roles</p>
        {previewModules.length === 0 ? (
          <p className="text-xs text-blue-800/70">Select at least one role to see module access.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {previewModules.map((label) => (
              <span
                key={label}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white border border-blue-200 text-blue-800"
              >
                {label}
              </span>
            ))}
          </div>
        )}
        {customPermissions && (
          <p className="text-[11px] text-amber-800 mt-2">
            Custom permissions are enabled — may differ from role defaults.{" "}
            <button type="button" onClick={syncFromRoles} className="font-semibold underline hover:no-underline">
              Sync from roles
            </button>
          </p>
        )}
        {!customPermissions && selectedRoles.length > 1 && (
          <p className="text-[11px] text-blue-800/80 mt-2">
            Permissions merged from {selectedRoles.length} roles ({mergedDefaults.length} grants).
          </p>
        )}
      </div>
    </section>
  );
}

export function UserRoleBadges({
  user,
  applicationRoles,
}: {
  user: { role: string; roles?: string[]; activeRole?: string };
  applicationRoles: ApplicationRoleDef[];
}) {
  const roles = resolveUserRoles(user);
  const primary = resolvePrimaryRole(user);
  const effective = resolveEffectiveRole(user);

  if (roles.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1">
        {roles.map((slug) => (
          <span
            key={slug}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${
              slug === primary ? getRoleBadgeColor(slug) : "bg-gray-100 text-gray-600 border border-gray-200"
            }`}
          >
            <Shield size={10} className={roleIconMap[slug] ?? "text-gray-500"} />
            {getRoleLabel(slug, applicationRoles)}
          </span>
        ))}
      </div>
      {roles.length > 1 && primary && (
        <span className="text-[10px] text-gray-400">
          Default on login: {getRoleLabel(primary, applicationRoles)}
          {effective !== primary ? ` · Active: ${getRoleLabel(effective, applicationRoles)}` : ""}
        </span>
      )}
    </div>
  );
}
