"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Landmark, Pencil, Loader2, X, CheckCircle2, XCircle, Trash2 } from "lucide-react";

/** `datetime-local` must use local wall time, not `toISOString()` (UTC). */
function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface OrgRow {
  _id: string;
  name: string;
  subscriptionStatus: string;
  plan: string;
  planLabel: string;
  trialEndsAt: string | null;
  paidThrough: string | null;
  billingNote: string;
  branchCount: number;
  userCount: number;
  leadCount: number;
  studentCount: number;
  enquiryCount: number;
  createdAt: string | null;
}

interface OrgSummary {
  total: number;
  trialing: number;
  active: number;
  expired: number;
  suspended: number;
}

const STATUSES = ["trialing", "active", "expired", "suspended"] as const;

const PLAN_OPTIONS = [
  { value: "trial", label: "Free trial" },
  { value: "starter", label: "Starter" },
  { value: "pro", label: "Pro" },
  { value: "enterprise", label: "Enterprise" },
] as const;

const STATUS_OPTIONS: { value: (typeof STATUSES)[number]; label: string; hint: string }[] = [
  { value: "trialing", label: "Free trial", hint: "Access until the trial end date." },
  { value: "active", label: "Active", hint: "Full access after payment. You can set a paid-through date." },
  { value: "expired", label: "Expired", hint: "No access until you set Active or extend the trial." },
  { value: "suspended", label: "Suspended", hint: "Blocked (e.g. payment follow-up)." },
];

/** Readable text in inputs; light color-scheme helps native date/time controls on dark OS theme. */
const orgFieldClass =
  "w-full min-h-[44px] px-3.5 py-2.5 text-[15px] leading-snug font-normal text-gray-900 " +
  "placeholder:text-gray-500 placeholder:font-normal " +
  "bg-white border border-gray-300 rounded-xl shadow-sm " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500/35 focus:border-blue-600 " +
  "[color-scheme:light]";

const orgFieldClassSelect = `${orgFieldClass} cursor-pointer appearance-none pr-10 bg-no-repeat`;

export default function OrganizationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rows, setRows] = useState<OrgRow[]>([]);
  const [summary, setSummary] = useState<OrgSummary | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<OrgRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrgRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusPreview, setStatusPreview] = useState<string>("active");

  useEffect(() => {
    if (status !== "loading" && session?.user?.role !== "super_admin") {
      router.replace("/dashboard");
    }
  }, [session, status, router]);

  const load = () => {
    setLoading(true);
    fetch("/api/organizations")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setRows(d);
          setSummary(null);
        } else {
          setRows(Array.isArray(d.organizations) ? d.organizations : []);
          setSummary(d.summary ?? null);
        }
      })
      .catch(() => {
        setRows([]);
        setSummary(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (session?.user?.role === "super_admin") load();
  }, [session?.user?.role]);

  useEffect(() => {
    if (edit) setStatusPreview(edit.subscriptionStatus);
  }, [edit]);

  const saveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!edit) return;
    setSaving(true);
    try {
      const fd = new FormData(e.currentTarget);
      const body = {
        name: String(fd.get("name") || "").trim(),
        subscriptionStatus: String(fd.get("subscriptionStatus") || ""),
        billingNote: String(fd.get("billingNote") || ""),
        paidThrough: String(fd.get("paidThrough") || "").trim() || null,
        trialEndsAt: String(fd.get("trialEndsAt") || "").trim() || null,
        plan: String(fd.get("plan") || "").trim() || undefined,
      };
      const res = await fetch(`/api/organizations/${edit._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setEdit(null);
        load();
      } else {
        const d = await res.json().catch(() => ({}));
        setActionError(typeof d?.error === "string" ? d.error : "Could not save changes.");
      }
    } finally {
      setSaving(false);
    }
  };

  const patchStatusOnly = async (orgId: string, subscriptionStatus: (typeof STATUSES)[number]) => {
    setActionError(null);
    setActingId(orgId);
    try {
      const res = await fetch(`/api/organizations/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionStatus }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(typeof d?.error === "string" ? d.error : "Update failed.");
        return;
      }
      load();
    } finally {
      setActingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/organizations/${deleteTarget._id}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        let msg = typeof d?.error === "string" ? d.error : "Delete failed.";
        const c = d?.counts as
          | { userCount?: number; leadCount?: number; studentCount?: number; enquiryCount?: number }
          | undefined;
        if (c && typeof c.userCount === "number") {
          const parts: string[] = [];
          if (c.userCount > 0) parts.push(`${c.userCount} user${c.userCount !== 1 ? "s" : ""} on branches`);
          if (c.leadCount && c.leadCount > 0) parts.push(`${c.leadCount} lead${c.leadCount !== 1 ? "s" : ""}`);
          if (c.studentCount && c.studentCount > 0) parts.push(`${c.studentCount} student${c.studentCount !== 1 ? "s" : ""}`);
          if (c.enquiryCount && c.enquiryCount > 0) {
            parts.push(`${c.enquiryCount} ${c.enquiryCount !== 1 ? "enquiries" : "enquiry"}`);
          }
          if (parts.length > 0) {
            msg += ` Currently linked: ${parts.join(", ")}. Deactivated users still count until their branch is changed or removed.`;
          }
        }
        setActionError(msg);
        return;
      }
      setDeleteTarget(null);
      load();
    } finally {
      setDeleting(false);
    }
  };

  const filteredRows = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return r.name.toLowerCase().includes(q) || r.subscriptionStatus.toLowerCase().includes(q);
  });

  if (status === "loading" || session?.user?.role !== "super_admin") {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500 text-sm">
        <Loader2 className="animate-spin mr-2" size={18} />
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Landmark className="text-blue-600" size={26} />
          Organizations & billing
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          One subscription covers every branch under an organization. Set status to <strong>active</strong> after you
          receive payment (manual billing). Use <strong>Close access</strong> to mark an org as expired;{" "}
          <strong>Delete</strong> only works when no users or CRM records are linked to its branches.
        </p>
      </div>

      {actionError && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm px-4 py-3 flex items-start justify-between gap-3"
          role="alert"
        >
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="shrink-0 text-red-600 hover:text-red-900 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total tenants", value: summary.total, className: "bg-slate-50 text-slate-800 border-slate-200" },
            { label: "Trialing", value: summary.trialing, className: "bg-amber-50 text-amber-900 border-amber-200" },
            { label: "Active", value: summary.active, className: "bg-emerald-50 text-emerald-900 border-emerald-200" },
            { label: "Expired", value: summary.expired, className: "bg-gray-50 text-gray-800 border-gray-200" },
            { label: "Suspended", value: summary.suspended, className: "bg-orange-50 text-orange-900 border-orange-200" },
          ].map((card) => (
            <div key={card.label} className={`rounded-xl border px-4 py-3 ${card.className}`}>
              <p className="text-xs font-medium opacity-80">{card.label}</p>
              <p className="text-2xl font-bold mt-1">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or status…"
          className="w-full sm:max-w-xs px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
        <p className="text-xs text-gray-500">
          Showing {filteredRows.length} of {rows.length} organizations
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-gray-400 text-sm">Loading…</p>
        ) : filteredRows.length === 0 ? (
          <p className="p-8 text-center text-gray-400 text-sm">No organizations match your search.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Usage</th>
                  <th className="px-4 py-3 font-medium">Branches</th>
                  <th className="px-4 py-3 font-medium">Trial ends</th>
                  <th className="px-4 py-3 font-medium">Paid through</th>
                  <th className="px-4 py-3 font-medium text-right min-w-[11rem]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRows.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          r.subscriptionStatus === "active"
                            ? "bg-green-100 text-green-800"
                            : r.subscriptionStatus === "trialing"
                              ? "bg-amber-100 text-amber-800"
                              : r.subscriptionStatus === "suspended"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {STATUS_OPTIONS.find((o) => o.value === r.subscriptionStatus)?.label ?? r.subscriptionStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{r.planLabel ?? r.plan ?? "trial"}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      <span title="Users">{r.userCount} users</span>
                      <span className="mx-1 text-gray-300">·</span>
                      <span title="Leads">{r.leadCount} leads</span>
                      <span className="mx-1 text-gray-300">·</span>
                      <span title="Students">{r.studentCount} students</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.branchCount}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {r.trialEndsAt ? new Date(r.trialEndsAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {r.paidThrough ? new Date(r.paidThrough).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setActionError(null);
                            setEdit(r);
                          }}
                          disabled={actingId === r._id}
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-40"
                          title="Edit organization"
                        >
                          <Pencil size={16} />
                        </button>
                        {r.subscriptionStatus !== "active" && (
                          <button
                            type="button"
                            onClick={() => patchStatusOnly(r._id, "active")}
                            disabled={actingId === r._id}
                            className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
                            title="Mark active (paid / full access)"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        {r.subscriptionStatus !== "expired" && (
                          <button
                            type="button"
                            onClick={() => patchStatusOnly(r._id, "expired")}
                            disabled={actingId === r._id}
                            className="p-2 rounded-lg text-amber-700 hover:bg-amber-50 disabled:opacity-40"
                            title="Close access (mark expired)"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setActionError(null);
                            setDeleteTarget(r);
                          }}
                          disabled={actingId === r._id}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40"
                          title="Delete organization"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="org-delete-title"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="bg-white text-gray-900 rounded-2xl shadow-xl border border-gray-200 w-full max-w-md p-6 [color-scheme:light]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="org-delete-title" className="text-lg font-semibold text-gray-900">
              Delete organization?
            </h2>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
              <span className="font-medium text-gray-800">{deleteTarget.name}</span> will be removed permanently. Tenant
              app settings and branches with no linked users, leads, students, or enquiries will be removed. If anything
              is still linked, delete will be blocked.
            </p>
            {actionError && deleteTarget && (
              <p className="text-sm text-red-600 mt-3" role="alert">
                {actionError}
              </p>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setActionError(null);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="px-4 py-2.5 text-sm font-medium text-white rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {edit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="org-edit-title"
          onClick={() => setEdit(null)}
        >
          <div
            className="bg-white text-gray-900 rounded-2xl shadow-xl border border-gray-200 w-full max-w-md max-h-[min(90vh,680px)] flex flex-col overflow-hidden [color-scheme:light]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-gray-100">
              <div>
                <h2 id="org-edit-title" className="text-lg font-semibold text-gray-900 tracking-tight">
                  Edit organization
                </h2>
                <p className="text-sm text-gray-600 mt-1 leading-snug">
                  Update how this tenant can use the app. Changes apply within about a minute for signed-in users.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEdit(null)}
                className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveEdit} className="flex flex-col flex-1 min-h-0">
              <div className="px-6 py-5 overflow-y-auto space-y-6">
                <section className="space-y-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Organization</h3>
                  <div>
                    <label htmlFor="org-name" className="block text-sm font-semibold text-gray-900 mb-1.5">
                      Display name
                    </label>
                    <input
                      id="org-name"
                      name="name"
                      defaultValue={edit.name}
                      placeholder="Company or group name"
                      autoComplete="organization"
                      className={orgFieldClass}
                    />
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Access</h3>
                  <div>
                    <label htmlFor="org-status" className="block text-sm font-semibold text-gray-900 mb-1.5">
                      Subscription status
                    </label>
                    <select
                      id="org-status"
                      name="subscriptionStatus"
                      defaultValue={edit.subscriptionStatus}
                      onChange={(e) => setStatusPreview(e.target.value)}
                      className={orgFieldClassSelect}
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                        backgroundPosition: "right 0.75rem center",
                        backgroundSize: "1rem",
                      }}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value} className="text-gray-900 bg-white">
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                      {STATUS_OPTIONS.find((o) => o.value === statusPreview)?.hint}
                    </p>
                  </div>
                  <div>
                    <label htmlFor="org-plan" className="block text-sm font-semibold text-gray-900 mb-1.5">
                      Plan
                    </label>
                    <select
                      id="org-plan"
                      name="plan"
                      defaultValue={edit.plan || "trial"}
                      className={orgFieldClassSelect}
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                        backgroundPosition: "right 0.75rem center",
                        backgroundSize: "1rem",
                      }}
                    >
                      {PLAN_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value} className="text-gray-900 bg-white">
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                      Controls max users, branches, and leads for this tenant.
                    </p>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Dates</h3>
                  <div className="grid gap-4 sm:grid-cols-1">
                    <div>
                      <label htmlFor="org-trial" className="block text-sm font-semibold text-gray-900 mb-1.5">
                        Trial ends
                      </label>
                      <input
                        id="org-trial"
                        name="trialEndsAt"
                        type="datetime-local"
                        defaultValue={toDatetimeLocalValue(edit.trialEndsAt)}
                        className={orgFieldClass}
                      />
                      <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                        Used while status is <span className="font-medium text-gray-800">Free trial</span>. Leave empty to clear.
                      </p>
                    </div>
                    <div>
                      <label htmlFor="org-paid" className="block text-sm font-semibold text-gray-900 mb-1.5">
                        Paid through
                      </label>
                      <input
                        id="org-paid"
                        name="paidThrough"
                        type="date"
                        defaultValue={toDateInputValue(edit.paidThrough)}
                        className={orgFieldClass}
                      />
                      <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                        Optional prepaid end date when status is <span className="font-medium text-gray-800">Active</span>. Empty
                        means no fixed end date.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Internal</h3>
                  <div>
                    <label htmlFor="org-note" className="block text-sm font-semibold text-gray-900 mb-1.5">
                      Billing note
                    </label>
                    <textarea
                      id="org-note"
                      name="billingNote"
                      rows={3}
                      defaultValue={edit.billingNote}
                      placeholder="e.g. Paid via bank transfer, invoice #…"
                      className={`${orgFieldClass} min-h-[100px] resize-y py-3`}
                    />
                  </div>
                </section>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setEdit(null)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2.5 text-sm font-medium text-white rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none transition-colors min-w-[88px]"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
