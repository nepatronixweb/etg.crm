"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Plus, Users, Search, KeyRound, X, UserPlus,
  Mail, Phone, Shield, Building2, Target, Calendar,
  Lock, Eye, EyeOff, CheckCircle2, AlertCircle,
  RotateCcw, UserCog, ChevronDown, Settings, Info, Trash2,
  Banknote, Clock, Globe,
} from "lucide-react";
import {
  formatDate,
  getRoleBadgeColor,
  getRoleLabel,
  ALL_PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
  SETTINGS_SUB_PERMISSIONS,
  ALL_SETTINGS_SUB_KEYS,
  stripModuleGranularKeys,
  withFullModuleGranular,
} from "@/lib/utils";
import { useApplicationRolesCatalog, useBranding } from "@/app/branding-context";
import { UserDashboardFormSection } from "@/components/users/UserDashboardFormSection";
import {
  mergeDashboardWidgetsFromApi,
  mergeDashboardWidgetOrderFromApi,
  type DashboardWidgetOrderState,
} from "@/lib/dashboardLayout";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  dateOfBirth?: string;
  branch: { _id: string; name: string } | null;
  target?: number;
  currentCount?: number;
  isActive: boolean;
  createdAt: string;
  permissions: string[];
  monthlySalary?: number;
  workingDays?: number;
  workingHoursPerDay?: number;
  officeNetworkIp?: string;
  dashboardWidgets?: Record<string, boolean>;
  dashboardWidgetOrder?: DashboardWidgetOrderState;
}

type UserFormState = {
  name: string;
  email: string;
  password: string;
  role: string;
  branch: string;
  phone: string;
  dateOfBirth: string;
  target: string;
  permissions: string[];
  monthlySalary: string;
  workingHoursPerDay: string;
  workingDays: string;
  officeNetworkIp: string;
  userDashboardWidgets: Record<string, boolean>;
  userDashboardOrder: DashboardWidgetOrderState;
};

/* ─── Role icon color (unknown slugs fall back) ─── */
const roleIconMap: Record<string, string> = {
  super_admin: "text-red-500",
  counsellor: "text-blue-500",
  telecaller: "text-green-500",
  application_team: "text-purple-500",
  admission_team: "text-yellow-600",
  visa_team: "text-orange-500",
  front_desk: "text-gray-500",
  account_finance: "text-teal-600",
};

export default function UsersPage() {
  const { data: session } = useSession();
  const branding = useBranding();
  const applicationRoles = useApplicationRolesCatalog();
  const isSuperAdmin = session?.user?.role === "super_admin";

  const defaultCreatableRole = useMemo(() => {
    const slugs = applicationRoles.map((r) => r.slug);
    const visible = isSuperAdmin ? slugs : slugs.filter((s) => s !== "super_admin");
    return visible[0] ?? "counsellor";
  }, [applicationRoles, isSuperAdmin]);

  const availableRoles = useMemo(() => {
    const slugs = applicationRoles.map((r) => r.slug);
    return isSuperAdmin ? slugs : slugs.filter((s) => s !== "super_admin");
  }, [applicationRoles, isSuperAdmin]);

  const defaultPermissionsForSlug = useCallback(
    (slug: string) => {
      const hit = applicationRoles.find((r) => r.slug === slug);
      if (hit?.defaultPermissions?.length) return [...hit.defaultPermissions];
      const legacy = ROLE_DEFAULT_PERMISSIONS[slug as keyof typeof ROLE_DEFAULT_PERMISSIONS];
      return legacy ? [...legacy] : [];
    },
    [applicationRoles]
  );

  const buildEmptyForm = useCallback((): UserFormState => ({
    name: "",
    email: "",
    password: "",
    role: defaultCreatableRole,
    branch: "",
    phone: "",
    dateOfBirth: "",
    target: "0",
    permissions: defaultPermissionsForSlug(defaultCreatableRole),
    monthlySalary: "0",
    workingHoursPerDay: "8",
    workingDays: "26",
    officeNetworkIp: "",
    userDashboardWidgets: {},
    userDashboardOrder: {},
  }), [defaultCreatableRole, defaultPermissionsForSlug]);

  /* ─── State ─── */
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<{ _id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  /* form modals */
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [adminSessionIp, setAdminSessionIp] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormState>(() => buildEmptyForm());
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  /* reset password modal */
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(() => new Set());
  const [bulkWorking, setBulkWorking] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const [tenantDashSettings, setTenantDashSettings] = useState<{
    widgets: Record<string, boolean>;
    order: DashboardWidgetOrderState;
  } | null>(null);

  useEffect(() => {
    if (!showForm) {
      setTenantDashSettings(null);
      return;
    }
    let cancelled = false;
    void fetch("/api/settings/app")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setTenantDashSettings({
          widgets: mergeDashboardWidgetsFromApi(d?.dashboardWidgets),
          order: mergeDashboardWidgetOrderFromApi(d?.dashboardWidgetOrder),
        });
      })
      .catch(() => {
        if (!cancelled) setTenantDashSettings(null);
      });
    return () => {
      cancelled = true;
    };
  }, [showForm]);

  /* ─── Fetch ─── */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
    fetch("/api/branches").then((r) => r.json()).then(setBranches);
  }, [fetchUsers]);

  useEffect(() => {
    if (!showForm || !isSuperAdmin) {
      setAdminSessionIp(null);
      return;
    }
    let cancelled = false;
    void fetch("/api/users/client-ip")
      .then((r) => r.json())
      .then((d: { ip?: string }) => {
        if (!cancelled && typeof d.ip === "string") setAdminSessionIp(d.ip);
      })
      .catch(() => {
        if (!cancelled) setAdminSessionIp(null);
      });
    return () => {
      cancelled = true;
    };
  }, [showForm, isSuperAdmin]);

  useEffect(() => {
    setSelectedUserIds(new Set());
  }, [search, roleFilter, statusFilter]);

  const roleFilterOptions = useMemo(() => {
    const fromCatalog = applicationRoles.map((r) => r.slug);
    const fromUsers = [...new Set(users.map((u) => u.role))];
    return [...new Set([...fromCatalog, ...fromUsers])];
  }, [applicationRoles, users]);

  /* ─── Filtered list ─── */
  const filtered = users.filter((u) => {
    if (search) {
      const q = search.toLowerCase();
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    }
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (statusFilter === "active" && !u.isActive) return false;
    if (statusFilter === "inactive" && u.isActive) return false;
    return true;
  });

  const canManageRow = useCallback(
    (u: User) => u._id !== session?.user?.id && (isSuperAdmin || u.role !== "super_admin"),
    [session?.user?.id, isSuperAdmin]
  );

  const selectableFiltered = useMemo(
    () => filtered.filter((u) => canManageRow(u)),
    [filtered, canManageRow]
  );

  const allPageSelected =
    selectableFiltered.length > 0 &&
    selectableFiltered.every((u) => selectedUserIds.has(u._id));
  const somePageSelected = selectableFiltered.some((u) => selectedUserIds.has(u._id));

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = somePageSelected && !allPageSelected;
  }, [somePageSelected, allPageSelected]);

  const toggleSelectAll = () => {
    setSelectedUserIds((prev) => {
      const allOnPage =
        selectableFiltered.length > 0 &&
        selectableFiltered.every((u) => prev.has(u._id));
      const next = new Set(prev);
      if (allOnPage) {
        selectableFiltered.forEach((u) => next.delete(u._id));
      } else {
        selectableFiltered.forEach((u) => next.add(u._id));
      }
      return next;
    });
  };

  const toggleUserSelected = (id: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deactivateUser = async (u: User) => {
    if (!u.isActive) return;
    if (!confirm(`Deactivate ${u.name}? They will not be able to sign in.`)) return;
    const res = await fetch(`/api/users/${u._id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      alert(d.error || "Failed to deactivate user");
      return;
    }
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      next.delete(u._id);
      return next;
    });
    fetchUsers();
  };

  const bulkDeactivateSelected = async () => {
    const ids = Array.from(selectedUserIds);
    if (ids.length === 0) return;
    if (!confirm(`Deactivate ${ids.length} selected user(s)? They will not be able to sign in.`)) return;
    setBulkWorking(true);
    try {
      const results = await Promise.all(
        ids.map((id) => fetch(`/api/users/${id}`, { method: "DELETE" }))
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length) {
        alert(`Some requests failed (${failed.length} of ${ids.length}).`);
      }
      setSelectedUserIds(new Set());
      await fetchUsers();
    } finally {
      setBulkWorking(false);
    }
  };

  /* ─── Create / Edit submit ─── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setFormLoading(true);

    const basePayload: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      role: form.role,
      branch: form.branch,
      phone: form.phone,
      dateOfBirth: form.dateOfBirth,
      target: Number(form.target),
      permissions: form.permissions,
    };
    if (isSuperAdmin) {
      basePayload.monthlySalary = Number(form.monthlySalary) || 0;
      basePayload.workingDays = Math.max(1, Math.min(31, Number(form.workingDays) || 26));
      const wh = Number(form.workingHoursPerDay);
      basePayload.workingHoursPerDay = Number.isFinite(wh) ? Math.min(24, Math.max(0, wh)) : 8;
      basePayload.officeNetworkIp = (form.officeNetworkIp || "").trim().slice(0, 128);
    }

    basePayload.dashboardWidgets = form.userDashboardWidgets;
    basePayload.dashboardWidgetOrder = form.userDashboardOrder;

    if (editUser) {
      const res = await fetch(`/api/users/${editUser._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(basePayload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setFormError(d.error || "Failed to update user");
        setFormLoading(false);
        return;
      }
      setFormSuccess("User updated successfully!");
    } else {
      /* create mode */
      if (!form.password || form.password.length < 6) {
        setFormError("Password must be at least 6 characters");
        setFormLoading(false);
        return;
      }
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...basePayload, password: form.password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setFormError(d.error || "Failed to create user");
        setFormLoading(false);
        return;
      }
      setFormSuccess("User created successfully!");
    }
    setFormLoading(false);
    fetchUsers();
    setTimeout(() => { closeForm(); }, 1200);
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role,
      branch: u.branch?._id || "",
      phone: u.phone || "",
      dateOfBirth: u.dateOfBirth || "",
      target: String(u.target || 0),
      permissions: u.permissions?.length ? [...u.permissions] : defaultPermissionsForSlug(u.role),
      monthlySalary: String(u.monthlySalary ?? 0),
      workingHoursPerDay: String(u.workingHoursPerDay ?? 8),
      workingDays: String(u.workingDays ?? 26),
      officeNetworkIp: u.officeNetworkIp ?? "",
      userDashboardWidgets:
        u.dashboardWidgets && typeof u.dashboardWidgets === "object" && !Array.isArray(u.dashboardWidgets)
          ? { ...u.dashboardWidgets }
          : {},
      userDashboardOrder: mergeDashboardWidgetOrderFromApi(u.dashboardWidgetOrder),
    });
    setFormError("");
    setFormSuccess("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditUser(null);
    setForm(buildEmptyForm());
    setFormError("");
    setFormSuccess("");
  };

  /* ─── Toggle active ─── */
  const toggleActive = async (u: User) => {
    const action = u.isActive ? "Deactivate" : "Reactivate";
    if (!confirm(`${action} ${u.name}?`)) return;
    await fetch(`/api/users/${u._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    fetchUsers();
  };

  /* ─── Reset password ─── */
  const openReset = (u: User) => {
    setResetTarget(u);
    setNewPassword("");
    setConfirmPassword("");
    setResetError("");
    setResetSuccess("");
  };
  const closeReset = () => {
    setResetTarget(null);
    setNewPassword("");
    setConfirmPassword("");
    setResetError("");
    setResetSuccess("");
  };
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");

    if (newPassword.length < 6) { setResetError("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { setResetError("Passwords do not match"); return; }

    setResetLoading(true);
    const res = await fetch(`/api/users/${resetTarget!._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    if (!res.ok) {
      setResetError("Failed to reset password");
      setResetLoading(false);
      return;
    }
    setResetSuccess("Password reset successfully!");
    setResetLoading(false);
    setTimeout(closeReset, 1500);
  };

  /* ─── Stats ─── */
  const activeCount = users.filter((u) => u.isActive).length;
  const inactiveCount = users.length - activeCount;

  /* ─── Render ─── */
  return (
    <div className="space-y-6">
      {/* Header + stats + filters */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm ring-1 ring-black/[0.04] overflow-hidden">
        <div className="px-5 py-5 sm:px-6 sm:py-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-gray-100">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
              style={{ backgroundColor: `${branding.brandColor}18` }}
            >
              <Users size={22} style={{ color: branding.brandColor }} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Team Members</h1>
              <p className="text-sm text-gray-600 mt-0.5">
                Manage your team - <span className="font-semibold text-gray-800 tabular-nums">{users.length}</span>{" "}
                {users.length === 1 ? "member" : "members"}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  {
                    label: "Total",
                    value: users.length,
                    className: "bg-slate-100 text-slate-800 border-slate-200",
                  },
                  {
                    label: "Active",
                    value: activeCount,
                    className: "bg-emerald-50 text-emerald-900 border-emerald-200",
                  },
                  {
                    label: "Inactive",
                    value: inactiveCount,
                    className: "bg-gray-100 text-gray-800 border-gray-300",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className={`inline-flex items-baseline gap-1.5 px-3 py-1.5 rounded-lg border text-xs sm:text-sm ${s.className}`}
                  >
                    <span className="font-medium opacity-90">{s.label}</span>
                    <span className="font-bold tabular-nums text-[13px] sm:text-sm">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              closeForm();
              setShowForm(true);
            }}
            className="inline-flex items-center justify-center gap-2 text-white px-4 py-2.5 sm:px-5 rounded-lg text-sm font-semibold shadow-md shadow-black/10 hover:brightness-105 active:scale-[0.99] transition-all shrink-0 w-full sm:w-auto"
            style={{ backgroundColor: branding.brandColor }}
          >
            <UserPlus size={17} strokeWidth={2.25} />
            Add Team Member
          </button>
        </div>

        <div className="px-5 py-4 sm:px-6 bg-gray-50/90 border-b border-gray-100">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Search & filter</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email"
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div className="flex flex-col gap-3 sm:contents">
              <div className="relative sm:min-w-[160px]">
                <label htmlFor="users-filter-role" className="sr-only">
                  Role
                </label>
                <select
                  id="users-filter-role"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="appearance-none w-full pl-3 pr-9 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">All roles</option>
                  {roleFilterOptions.map((r) => (
                    <option key={r} value={r}>
                      {getRoleLabel(r, applicationRoles)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
              <div className="relative sm:min-w-[140px]">
                <label htmlFor="users-filter-status" className="sr-only">
                  Status
                </label>
                <select
                  id="users-filter-status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                  className="appearance-none w-full pl-3 pr-9 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">All status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {selectedUserIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 px-5 py-2.5 border-b border-blue-100 bg-blue-50/80 text-sm">
            <span className="font-medium text-gray-700 tabular-nums">{selectedUserIds.size} selected</span>
            <button
              type="button"
              disabled={bulkWorking}
              onClick={bulkDeactivateSelected}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 size={14} />
              Deactivate selected
            </button>
            <button
              type="button"
              disabled={bulkWorking}
              onClick={() => setSelectedUserIds(new Set())}
              className="text-xs font-semibold text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="w-12 px-3 py-3.5">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/30"
                    checked={allPageSelected}
                    onChange={toggleSelectAll}
                    disabled={selectableFiltered.length === 0 || bulkWorking}
                    aria-label="Select all users on this page"
                  />
                </th>
                {["Member", "Role", "Branch", "Target", "Status", "Joined", "Actions"].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={8} className="text-center py-16 text-gray-400">
                  <div className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /> Loading…</div>
                </td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-16 text-gray-400">No users found</td></tr>
              )}
              {filtered.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="w-12 px-3 py-3.5 align-middle">
                    {canManageRow(user) ? (
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/30"
                        checked={selectedUserIds.has(user._id)}
                        onChange={() => toggleUserSelected(user._id)}
                        disabled={bulkWorking}
                        aria-label={`Select ${user.name}`}
                      />
                    ) : null}
                  </td>
                  {/* Member */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                        style={{ backgroundColor: branding.brandColor }}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  {/* Role */}
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                      <Shield size={11} className={roleIconMap[user.role] ?? "text-gray-500"} />
                      {getRoleLabel(user.role, applicationRoles)}
                    </span>
                  </td>
                  {/* Branch */}
                  <td className="px-5 py-3.5 text-gray-600">{user.branch?.name || "-"}</td>
                  {/* Target */}
                  <td className="px-5 py-3.5">
                    {user.role === "counsellor" ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, ((user.currentCount || 0) / (user.target || 1)) * 100)}%`,
                              backgroundColor: branding.brandColor,
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 font-medium">{user.currentCount || 0}/{user.target || 0}</span>
                      </div>
                    ) : <span className="text-gray-400">-</span>}
                  </td>
                  {/* Status */}
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.isActive ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-50 text-gray-500 border border-gray-200"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-green-500" : "bg-gray-400"}`} />
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  {/* Joined */}
                  <td className="px-5 py-3.5 text-gray-500 text-xs">{formatDate(user.createdAt)}</td>
                  {/* Actions */}
                  <td className="px-5 py-3.5">
                    {canManageRow(user) && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(user)}
                          title="Edit user"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <UserCog size={15} />
                        </button>
                        <button
                          onClick={() => openReset(user)}
                          title="Reset password"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <KeyRound size={15} />
                        </button>
                        <button
                          onClick={() => toggleActive(user)}
                          title={user.isActive ? "Deactivate" : "Reactivate"}
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.isActive
                              ? "text-gray-400 hover:text-red-600 hover:bg-red-50"
                              : "text-gray-400 hover:text-green-600 hover:bg-green-50"
                          }`}
                        >
                          <RotateCcw size={15} />
                        </button>
                        <button
                          onClick={() => deactivateUser(user)}
                          title={user.isActive ? "Deactivate user" : "Already inactive"}
                          disabled={!user.isActive || bulkWorking}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:pointer-events-none disabled:opacity-30"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Add / Edit User Modal ─── */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeForm}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col ring-1 ring-black/[0.06] animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 sm:px-7 sm:py-5 border-b border-gray-200/90 bg-gradient-to-r from-gray-50/80 to-white flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
                  style={{ backgroundColor: branding.brandColor }}
                >
                  {editUser ? <UserCog size={22} /> : <UserPlus size={22} />}
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-900 text-lg tracking-tight">
                    {editUser ? "Edit Team Member" : "Add Team Member"}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                    {editUser ? "Update member details" : "Fill in the details to create a new user"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 sm:px-7 py-6 space-y-8">
                {formError && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" /> <span>{formError}</span>
                  </div>
                )}
                {formSuccess && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
                    <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> <span>{formSuccess}</span>
                  </div>
                )}

                <section className="space-y-4">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Account</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                    <div>
                      <label htmlFor="user-form-name" className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Full name <span className="text-red-500 font-bold">*</span>
                      </label>
                      <div className="relative">
                        <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          id="user-form-name"
                          type="text"
                          required
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          placeholder="John Doe"
                          className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="user-form-email" className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Email <span className="text-red-500 font-bold">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          id="user-form-email"
                          type="email"
                          required
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="admin@company.com"
                          className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                  {!editUser && (
                    <div>
                      <label htmlFor="user-form-password" className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Password <span className="text-red-500 font-bold">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          id="user-form-password"
                          type="password"
                          required
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          placeholder="Minimum 6 characters"
                          minLength={6}
                          className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                  )}
                </section>

                <section className="space-y-4">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Contact</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                    <div>
                      <label htmlFor="user-form-phone" className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Phone
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          id="user-form-phone"
                          type="tel"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          placeholder="+91 9876543210"
                          className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="user-form-dob" className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Date of birth
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-[1]" />
                        <input
                          id="user-form-dob"
                          type="date"
                          value={form.dateOfBirth}
                          onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                          className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors min-h-[42px]"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Role & branch</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                    <div>
                      <label htmlFor="user-form-role" className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Role <span className="text-red-500 font-bold">*</span>
                      </label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-[1]" />
                        <select
                          id="user-form-role"
                          required
                          value={form.role}
                          onChange={(e) => {
                            const newRole = e.target.value;
                            setForm({
                              ...form,
                              role: newRole,
                              permissions: defaultPermissionsForSlug(newRole),
                              userDashboardWidgets: {},
                              userDashboardOrder: {},
                            });
                          }}
                          className="appearance-none w-full pl-10 pr-9 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer"
                        >
                          {availableRoles.map((r) => (
                            <option key={r} value={r}>
                              {getRoleLabel(r, applicationRoles)}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="user-form-branch" className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Branch <span className="text-red-500 font-bold">*</span>
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-[1]" />
                        <select
                          id="user-form-branch"
                          required
                          value={form.branch}
                          onChange={(e) => setForm({ ...form, branch: e.target.value })}
                          className="appearance-none w-full pl-10 pr-9 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer"
                        >
                          <option value="">Select branch</option>
                          {branches.map((b) => (
                            <option key={b._id} value={b._id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </section>

                {tenantDashSettings && (
                  <UserDashboardFormSection
                    roleSlug={form.role}
                    tenantWidgets={tenantDashSettings.widgets}
                    tenantOrder={tenantDashSettings.order}
                    userWidgets={form.userDashboardWidgets}
                    userOrder={form.userDashboardOrder}
                    onChangeUserWidgets={(userDashboardWidgets) => setForm((f) => ({ ...f, userDashboardWidgets }))}
                    onChangeUserOrder={(userDashboardOrder) => setForm((f) => ({ ...f, userDashboardOrder }))}
                  />
                )}

                {isSuperAdmin && (
                  <section className="space-y-4">
                    <div>
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">HR & payroll</h3>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        Used in <span className="font-semibold text-gray-800">HR management</span> (salary report). Working days drive
                        per-day pay. Registered IP is for your records; live check-in IP and GPS still come from attendance.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                      <div>
                        <label htmlFor="user-form-salary" className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Salary (monthly)
                        </label>
                        <div className="relative">
                          <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          <input
                            id="user-form-salary"
                            type="number"
                            min={0}
                            step="0.01"
                            value={form.monthlySalary}
                            onChange={(e) => setForm({ ...form, monthlySalary: e.target.value })}
                            placeholder="0.00"
                            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 tabular-nums placeholder:text-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="user-form-working-hours" className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Working hours (per day)
                        </label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          <input
                            id="user-form-working-hours"
                            type="number"
                            min={0}
                            max={24}
                            step={0.5}
                            value={form.workingHoursPerDay}
                            onChange={(e) => setForm({ ...form, workingHoursPerDay: e.target.value })}
                            placeholder="8"
                            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 tabular-nums placeholder:text-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="user-form-working-days" className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Number of working days (monthly)
                        </label>
                        <input
                          id="user-form-working-days"
                          type="number"
                          min={1}
                          max={31}
                          value={form.workingDays}
                          onChange={(e) => setForm({ ...form, workingDays: e.target.value })}
                          placeholder="26"
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 tabular-nums placeholder:text-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="user-form-office-ip" className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Registered network IP
                        </label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          <input
                            id="user-form-office-ip"
                            type="text"
                            value={form.officeNetworkIp}
                            onChange={(e) => setForm({ ...form, officeNetworkIp: e.target.value })}
                            placeholder="Expected office / static IP for this member (optional)"
                            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 font-mono placeholder:text-gray-500 placeholder:font-sans shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            autoComplete="off"
                          />
                        </div>
                        {adminSessionIp ? (
                          <p className="text-xs text-gray-600 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span>
                              <span className="font-semibold text-gray-700">Your admin session (as seen by server):</span>{" "}
                              <code className="text-[11px] font-mono bg-gray-100 text-gray-900 px-1.5 py-0.5 rounded border border-gray-200">
                                {adminSessionIp}
                              </code>
                            </span>
                            <button
                              type="button"
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                              onClick={() => setForm((f) => ({ ...f, officeNetworkIp: adminSessionIp }))}
                            >
                              Copy into field
                            </button>
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500 mt-2">Open this form while online to detect your current IP for quick fill.</p>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                <section className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900">Module permissions</h3>
                      <p className="text-xs text-gray-600 leading-relaxed max-w-xl">
                        Role defaults are pre-filled. For Leads and Students, enable the module first, then optionally restrict Add and Export; other modules are access-only. Updates apply on the user&apos;s next login.
                      </p>
                    </div>
                    {form.role !== "super_admin" && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const next: string[] = [];
                            for (const p of ALL_PERMISSIONS) {
                              next.push(p.key);
                              if (p.key === "leads") {
                                next.push("leads_acl", "leads_add", "leads_export");
                              }
                              if (p.key === "students") {
                                next.push("students_acl", "students_add", "students_export");
                              }
                              if (p.key === "settings") {
                                next.push(...ALL_SETTINGS_SUB_KEYS);
                              }
                            }
                            setForm({ ...form, permissions: next });
                          }}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                          Select all
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, permissions: [] })}
                          className="text-xs font-semibold text-gray-600 hover:text-gray-800"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {form.role === "super_admin" ? (
                    <div className="flex gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
                      <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Full system access</p>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          Super admins are not restricted by module permissions; checks are skipped automatically.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {ALL_PERMISSIONS.map((perm) => {
                          if (perm.key === "leads" || perm.key === "students") {
                            const module = perm.key;
                            const aclKey = `${module}_acl`;
                            const addKey = `${module}_add`;
                            const exportKey = `${module}_export`;
                            const hasBase = form.permissions.includes(module);
                            const granular = form.permissions.includes(aclKey);
                            const addOn = granular ? form.permissions.includes(addKey) : hasBase;
                            const exportOn = granular ? form.permissions.includes(exportKey) : hasBase;
                            const addLabel = module === "leads" ? "Add lead" : "Add student";
                            return (
                              <div
                                key={module}
                                className={`flex flex-col gap-2 p-3 rounded-lg border transition-colors select-none ${
                                  hasBase
                                    ? "bg-white border-blue-400 shadow-sm"
                                    : "bg-white/80 border-gray-200"
                                }`}
                              >
                                <label className="flex items-start gap-3 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={hasBase}
                                    onChange={() => {
                                      if (hasBase) {
                                        setForm({
                                          ...form,
                                          permissions: stripModuleGranularKeys(form.permissions, module),
                                        });
                                      } else {
                                        setForm({
                                          ...form,
                                          permissions: withFullModuleGranular(form.permissions, module),
                                        });
                                      }
                                    }}
                                    className="mt-0.5 accent-blue-600 shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-gray-900 leading-snug">{perm.label}</p>
                                    <p className="text-[11px] text-gray-600 leading-snug mt-1">{perm.description}</p>
                                  </div>
                                </label>
                                {hasBase && (
                                  <div className="pl-8 sm:pl-9 flex flex-wrap gap-x-4 gap-y-2 pt-2 border-t border-gray-100">
                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-full sm:w-auto sm:mr-1">
                                      Also allow
                                    </span>
                                    <label className="flex items-center gap-2 text-[11px] text-gray-800 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={addOn}
                                        onChange={() => {
                                          let next = [...form.permissions];
                                          if (!next.includes(aclKey) && next.includes(module)) {
                                            next = withFullModuleGranular(stripModuleGranularKeys(next, module), module);
                                          }
                                          if (next.includes(addKey)) {
                                            next = next.filter((p) => p !== addKey);
                                          } else {
                                            next.push(addKey);
                                          }
                                          setForm({ ...form, permissions: next });
                                        }}
                                        className="accent-blue-600 shrink-0"
                                      />
                                      {addLabel}
                                    </label>
                                    <label className="flex items-center gap-2 text-[11px] text-gray-800 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={exportOn}
                                        onChange={() => {
                                          let next = [...form.permissions];
                                          if (!next.includes(aclKey) && next.includes(module)) {
                                            next = withFullModuleGranular(stripModuleGranularKeys(next, module), module);
                                          }
                                          if (next.includes(exportKey)) {
                                            next = next.filter((p) => p !== exportKey);
                                          } else {
                                            next.push(exportKey);
                                          }
                                          setForm({ ...form, permissions: next });
                                        }}
                                        className="accent-blue-600 shrink-0"
                                      />
                                      Export (Excel)
                                    </label>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          const checked = form.permissions.includes(perm.key);
                          return (
                            <label
                              key={perm.key}
                              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors select-none ${
                                checked
                                  ? "bg-white border-blue-400 shadow-sm"
                                  : "bg-white/80 border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  let next: string[];
                                  if (checked) {
                                    next = form.permissions.filter((p) => p !== perm.key);
                                    if (perm.key === "settings") {
                                      next = next.filter((p) => !p.startsWith("settings:"));
                                    }
                                  } else {
                                    next = [...form.permissions, perm.key];
                                    if (perm.key === "settings") {
                                      next = [...next, ...ALL_SETTINGS_SUB_KEYS];
                                    }
                                  }
                                  setForm({ ...form, permissions: next });
                                }}
                                className="mt-0.5 accent-blue-600 shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-900 leading-snug">{perm.label}</p>
                                <p className="text-[11px] text-gray-600 leading-snug mt-1">{perm.description}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      {form.permissions.includes("settings") && (
                        <div className="mt-1 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                            <div>
                              <p className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                                <Settings size={14} className="text-gray-500" /> Settings sections
                              </p>
                              <p className="text-[11px] text-gray-600 mt-1">Choose which settings tabs this user can open.</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setForm({
                                    ...form,
                                    permissions: [...form.permissions.filter((p) => !p.startsWith("settings:")), ...ALL_SETTINGS_SUB_KEYS],
                                  })
                                }
                                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                              >
                                All
                              </button>
                              <span className="text-gray-300 text-[11px]">|</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setForm({ ...form, permissions: form.permissions.filter((p) => !p.startsWith("settings:")) })
                                }
                                className="text-[11px] font-semibold text-gray-600 hover:text-gray-800"
                              >
                                None
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {SETTINGS_SUB_PERMISSIONS.map((sub) => {
                              const subChecked = form.permissions.includes(sub.key);
                              return (
                                <label
                                  key={sub.key}
                                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors select-none text-xs ${
                                    subChecked
                                      ? "bg-blue-50/80 border-blue-300 text-gray-900 font-medium"
                                      : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={subChecked}
                                    onChange={() => {
                                      const next = subChecked
                                        ? form.permissions.filter((p) => p !== sub.key)
                                        : [...form.permissions, sub.key];
                                      setForm({ ...form, permissions: next });
                                    }}
                                    className="accent-blue-600 shrink-0"
                                  />
                                  {sub.label}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </section>

                {form.role === "counsellor" && (
                  <section className="space-y-4">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Targets</h3>
                    <div className="max-w-full sm:max-w-xs">
                      <label htmlFor="user-form-target" className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Monthly visa target
                      </label>
                      <div className="relative">
                        <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          id="user-form-target"
                          type="number"
                          min={0}
                          value={form.target}
                          onChange={(e) => setForm({ ...form, target: e.target.value })}
                          className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                  </section>
                )}
              </div>

              <div className="shrink-0 px-6 sm:px-7 py-4 border-t border-gray-200 bg-gray-50/90 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
                <button
                  type="button"
                  onClick={closeForm}
                  className="w-full sm:w-auto px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full sm:w-auto px-6 py-2.5 text-white rounded-lg text-sm font-semibold shadow-sm transition-all hover:brightness-105 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                  style={{ backgroundColor: branding.brandColor }}
                >
                  {formLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Plus size={18} strokeWidth={2.5} />
                      {editUser ? "Update user" : "Create user"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Reset Password Modal ─── */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeReset}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <KeyRound size={20} className="text-amber-600" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">Reset Password</h2>
                  <p className="text-xs text-gray-500">for {resetTarget.name}</p>
                </div>
              </div>
              <button onClick={closeReset} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleReset} className="px-6 py-5 space-y-4">
              {resetError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <AlertCircle size={16} className="shrink-0" /> {resetError}
                </div>
              )}
              {resetSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                  <CheckCircle2 size={16} className="shrink-0" /> {resetSuccess}
                </div>
              )}

              {/* Info box */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
                You are about to reset the password for <span className="font-bold">{resetTarget.email}</span>. The user will need to use the new password to log in.
              </div>

              {/* New password */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                  <Lock size={13} className="text-gray-400" /> New Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPw ? "text" : "password"}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-3.5 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all placeholder:text-gray-300"
                  />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                  <Lock size={13} className="text-gray-400" /> Confirm Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPw ? "text" : "password"}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className={`w-full px-3.5 py-2.5 pr-10 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all placeholder:text-gray-300 ${
                      confirmPassword && confirmPassword !== newPassword
                        ? "border-red-300 focus:ring-red-500/30 focus:border-red-400"
                        : confirmPassword && confirmPassword === newPassword
                        ? "border-green-300 focus:ring-green-500/30 focus:border-green-400"
                        : "border-gray-200 focus:ring-amber-500/30 focus:border-amber-400"
                    }`}
                  />
                  <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12} /> Passwords do not match</p>
                )}
                {confirmPassword && confirmPassword === newPassword && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle2 size={12} /> Passwords match</p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button type="button" onClick={closeReset}
                  className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {resetLoading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Resetting…</>
                  ) : (
                    <><KeyRound size={16} /> Reset Password</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
