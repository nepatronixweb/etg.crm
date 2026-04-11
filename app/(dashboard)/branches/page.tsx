"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, Building2, X, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Branch { _id: string; name: string; location: string; phone?: string; email?: string; isActive: boolean; createdAt: string; organization?: string; }

interface OrgOption { _id: string; name: string; subscriptionStatus: string }

const SUBSCRIPTION_LABEL: Record<string, string> = {
  trialing: "Free trial",
  active: "Active",
  expired: "Expired",
  suspended: "Suspended",
};

const branchFieldClass =
  "w-full min-h-[44px] px-3.5 py-2.5 text-[15px] leading-snug font-normal text-gray-900 " +
  "placeholder:text-gray-500 " +
  "bg-white border border-gray-300 rounded-xl shadow-sm " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500/35 focus:border-blue-600 " +
  "[color-scheme:light]";

const branchSelectClass = `${branchFieldClass} cursor-pointer appearance-none pr-10 bg-no-repeat`;

export default function BranchesPage() {
  const { data: session } = useSession();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", phone: "", email: "" });
  const [orgOptions, setOrgOptions] = useState<OrgOption[]>([]);
  const [branchOrgMode, setBranchOrgMode] = useState<"existing" | "new">("existing");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [newOrganizationName, setNewOrganizationName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchBranches = async () => {
    setLoading(true);
    const res = await fetch("/api/branches");
    const data = await res.json();
    setBranches(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchBranches(); }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const isSuperAdmin = session?.user?.role === "super_admin";
  useEffect(() => {
    if (!showForm || !isSuperAdmin) return;
    fetch("/api/organizations")
      .then((r) => r.json())
      .then((d) => (Array.isArray(d) ? setOrgOptions(d) : setOrgOptions([])))
      .catch(() => setOrgOptions([]));
  }, [showForm, isSuperAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = { ...form };
    if (isSuperAdmin) {
      if (branchOrgMode === "new") {
        payload.createNewOrganization = true;
        if (newOrganizationName.trim()) payload.newOrganizationName = newOrganizationName.trim();
      } else {
        payload.organizationId = selectedOrgId;
      }
    }
    const res = await fetch("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(typeof err?.error === "string" ? err.error : "Could not create branch");
      return;
    }
    setShowForm(false);
    setForm({ name: "", location: "", phone: "", email: "" });
    setBranchOrgMode("existing");
    setSelectedOrgId("");
    setNewOrganizationName("");
    fetchBranches();
  };

  const isAdmin =
    isSuperAdmin ||
    (session?.user?.permissions ?? []).includes("branches");

  const confirmDeleteBranch = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/branches/${deleteTarget._id}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        let msg = typeof d?.error === "string" ? d.error : "Could not delete branch.";
        const c = d?.counts as
          | { userCount?: number; leadCount?: number; studentCount?: number; enquiryCount?: number }
          | undefined;
        if (c && typeof c.userCount === "number") {
          const parts: string[] = [];
          if (c.userCount > 0) parts.push(`${c.userCount} user${c.userCount !== 1 ? "s" : ""}`);
          if (c.leadCount && c.leadCount > 0) parts.push(`${c.leadCount} lead${c.leadCount !== 1 ? "s" : ""}`);
          if (c.studentCount && c.studentCount > 0) parts.push(`${c.studentCount} student${c.studentCount !== 1 ? "s" : ""}`);
          if (c.enquiryCount && c.enquiryCount > 0) {
            parts.push(`${c.enquiryCount} ${c.enquiryCount !== 1 ? "enquiries" : "enquiry"}`);
          }
          if (parts.length > 0) msg += ` Still linked: ${parts.join(", ")}.`;
        }
        setDeleteError(msg);
        return;
      }
      setDeleteTarget(null);
      fetchBranches();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Building2 /> Branches</h1>
          <p className="text-gray-500 text-sm">{branches.length} branches</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> Add Branch
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && <p className="text-gray-400 text-sm col-span-3 text-center py-8">Loading...</p>}
        {branches.map((b) => (
          <div key={b._id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow flex flex-col">
            <div className="flex items-start justify-between mb-3 gap-2">
              <div className="p-2 bg-blue-50 rounded-lg"><Building2 size={20} className="text-blue-600" /></div>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${b.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {b.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{b.name}</h3>
            <p className="text-sm text-gray-500 mb-3">{b.location}</p>
            {b.phone && <p className="text-xs text-gray-400">📞 {b.phone}</p>}
            {b.email && <p className="text-xs text-gray-400">✉️ {b.email}</p>}
            <div className="mt-auto pt-3 flex items-center justify-between gap-2 border-t border-gray-50">
              <p className="text-xs text-gray-300">Added {formatDate(b.createdAt)}</p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteTarget(b);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Trash2 size={14} aria-hidden />
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => {
            if (!deleting) {
              setDeleteTarget(null);
              setDeleteError(null);
            }
          }}
        >
          <div
            className="bg-white text-gray-900 rounded-2xl shadow-xl border border-gray-200 w-full max-w-md p-6 [color-scheme:light]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="branch-delete-title"
          >
            <h2 id="branch-delete-title" className="text-lg font-semibold text-gray-900">
              Delete branch?
            </h2>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
              <span className="font-medium text-gray-800">{deleteTarget.name}</span> will be removed permanently. This
              is only allowed when no users, leads, students, or enquiries are linked to this branch.
            </p>
            {deleteError && (
              <p className="text-sm text-red-600 mt-3" role="alert">
                {deleteError}
              </p>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void confirmDeleteBranch()}
                className="px-4 py-2.5 text-sm font-medium text-white rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Trash2 size={16} aria-hidden />
                {deleting ? "Deleting…" : "Delete branch"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-branch-title"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-white text-gray-900 rounded-2xl shadow-xl border border-gray-200 w-full max-w-md max-h-[min(92vh,720px)] flex flex-col overflow-hidden [color-scheme:light]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-gray-200">
              <div>
                <h2 id="new-branch-title" className="text-lg font-semibold text-gray-900 tracking-tight">
                  New branch
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {isSuperAdmin
                    ? "Link to an existing billable organization, or start a new 15-day trial for a new customer."
                    : "Add a location under your company’s subscription."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="shrink-0 p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="px-6 py-5 overflow-y-auto space-y-5">
                {isSuperAdmin && (
                  <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-4 [color-scheme:light]">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-blue-900/80">
                      Organization
                    </h3>
                    <div className="space-y-3">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          name="orgMode"
                          checked={branchOrgMode === "existing"}
                          onChange={() => setBranchOrgMode("existing")}
                          className="mt-1 size-4 shrink-0 border-gray-400 text-blue-600 focus:ring-blue-500"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-gray-900">Existing organization</span>
                          <span className="block text-sm text-gray-600 mt-0.5 leading-snug">
                            Same subscription or trial as the org you pick below.
                          </span>
                        </span>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          name="orgMode"
                          checked={branchOrgMode === "new"}
                          onChange={() => setBranchOrgMode("new")}
                          className="mt-1 size-4 shrink-0 border-gray-400 text-blue-600 focus:ring-blue-500"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-gray-900">New organization</span>
                          <span className="block text-sm text-gray-600 mt-0.5 leading-snug">
                            Starts a <span className="font-medium text-gray-800">15-day free trial</span> for a new
                            customer.
                          </span>
                        </span>
                      </label>
                    </div>
                    {branchOrgMode === "existing" && (
                      <div>
                        <label htmlFor="branch-org-select" className="block text-sm font-semibold text-gray-900 mb-1.5">
                          Organization <span className="text-red-600">*</span>
                        </label>
                        <select
                          id="branch-org-select"
                          required
                          value={selectedOrgId}
                          onChange={(e) => setSelectedOrgId(e.target.value)}
                          className={branchSelectClass}
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                            backgroundPosition: "right 0.75rem center",
                            backgroundSize: "1rem",
                          }}
                        >
                          <option value="" className="text-gray-500">
                            Choose an organization…
                          </option>
                          {orgOptions.map((o) => (
                            <option key={o._id} value={o._id} className="text-gray-900">
                              {o.name} — {SUBSCRIPTION_LABEL[o.subscriptionStatus] ?? o.subscriptionStatus}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {branchOrgMode === "new" && (
                      <div>
                        <label htmlFor="branch-new-org-name" className="block text-sm font-semibold text-gray-900 mb-1.5">
                          Organization name <span className="text-gray-500 font-normal">(optional)</span>
                        </label>
                        <input
                          id="branch-new-org-name"
                          value={newOrganizationName}
                          onChange={(e) => setNewOrganizationName(e.target.value)}
                          placeholder="Defaults to branch name if empty"
                          className={branchFieldClass}
                        />
                      </div>
                    )}
                  </section>
                )}

                <section className="space-y-4">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Branch details</h3>
                  {[
                    { label: "Branch name", key: "name", required: true, placeholder: "e.g. Kathmandu — Main" },
                    { label: "Location", key: "location", required: true, placeholder: "City, country" },
                    { label: "Phone", key: "phone", required: false, placeholder: "Optional" },
                    { label: "Email", key: "email", required: false, placeholder: "Optional" },
                  ].map(({ label, key, required, placeholder }) => (
                    <div key={key}>
                      <label htmlFor={`branch-${key}`} className="block text-sm font-semibold text-gray-900 mb-1.5">
                        {label}{" "}
                        {required ? <span className="text-red-600">*</span> : <span className="text-gray-500 font-normal text-xs">(optional)</span>}
                      </label>
                      <input
                        id={`branch-${key}`}
                        required={required}
                        value={(form as Record<string, string>)[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        placeholder={placeholder}
                        type={key === "email" ? "email" : "text"}
                        autoComplete={key === "email" ? "email" : key === "phone" ? "tel" : "off"}
                        className={branchFieldClass}
                      />
                    </div>
                  ))}
                </section>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-800 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-sm font-medium text-white rounded-xl bg-blue-600 hover:bg-blue-700 transition-colors min-w-[96px]"
                >
                  Create branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
