"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Plus,
  RefreshCw,
  UserPlus,
  RotateCcw,
  Loader2,
  X,
  Search,
  History,
  Trash2,
  Pencil,
} from "lucide-react";
import { useBranding } from "@/app/branding-context";
import { categoryLabel, useInventoryBranches, useInventoryConfig } from "./useInventoryHooks";

type UserOpt = { _id: string; name: string; email: string };
type BranchOpt = { _id: string; name: string };
type AssetRow = {
  _id: string;
  name: string;
  category: string;
  assetTag: string;
  serialNumber?: string;
  purchaseDate: string;
  price: number;
  condition: string;
  status: string;
  location?: string;
  notes?: string;
  warrantyExpiry?: string | null;
  branch?: BranchOpt | null;
  assignedTo?: UserOpt | null;
};

type AssignmentRow = {
  _id: string;
  assignedDate: string;
  returnedDate?: string | null;
  status: string;
  notes?: string;
  userId?: UserOpt;
  assignedBy?: { name?: string };
};

const emptyForm = () => ({
  name: "",
  category: "electronics",
  assetTag: "",
  serialNumber: "",
  purchaseDate: new Date().toISOString().slice(0, 10),
  price: 0,
  condition: "good",
  status: "available",
  location: "",
  notes: "",
  warrantyExpiry: "",
  branch: "",
});

export default function AssetsManager() {
  const branding = useBranding();
  const branches = useInventoryBranches();
  const { config } = useInventoryConfig();
  const categories = config?.categories ?? [];

  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [assignFor, setAssignFor] = useState<AssetRow | null>(null);
  const [assignUserId, setAssignUserId] = useState("");
  const [historyFor, setHistoryFor] = useState<AssetRow | null>(null);
  const [history, setHistory] = useState<AssignmentRow[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const queryString = useCallback(() => {
    const p = new URLSearchParams();
    if (debouncedSearch) p.set("search", debouncedSearch);
    if (branchFilter) p.set("branch", branchFilter);
    if (categoryFilter !== "all") p.set("category", categoryFilter);
    if (statusFilter !== "all") p.set("status", statusFilter);
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [debouncedSearch, branchFilter, categoryFilter, statusFilter]);

  const loadAssets = useCallback(async () => {
    const r = await fetch(`/api/inventory/assets${queryString()}`);
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Failed to load assets");
    setAssets(d.assets || []);
  }, [queryString]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      await loadAssets();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [loadAssets]);

  useEffect(() => {
    fetch("/api/inventory/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm(), category: categories[0]?.slug ?? "electronics" });
    setDrawerOpen(true);
  };

  const openEdit = (a: AssetRow) => {
    setEditId(a._id);
    setForm({
      name: a.name,
      category: a.category,
      assetTag: a.assetTag,
      serialNumber: a.serialNumber ?? "",
      purchaseDate: a.purchaseDate?.slice(0, 10) ?? "",
      price: a.price,
      condition: a.condition,
      status: a.status,
      location: a.location ?? "",
      notes: a.notes ?? "",
      warrantyExpiry: a.warrantyExpiry?.slice(0, 10) ?? "",
      branch: a.branch?._id ?? "",
    });
    setDrawerOpen(true);
  };

  const saveAsset = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const payload = {
        ...form,
        branch: form.branch || null,
        warrantyExpiry: form.warrantyExpiry || null,
      };
      const r = await fetch(editId ? `/api/inventory/assets/${editId}` : "/api/inventory/assets", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Save failed");
      setDrawerOpen(false);
      await loadAssets();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const submitAssign = async () => {
    if (!assignFor || !assignUserId) return;
    setBusy(true);
    try {
      const r = await fetch("/api/inventory/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: assignFor._id, userId: assignUserId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Assign failed");
      setAssignFor(null);
      setAssignUserId("");
      await loadAssets();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const doReturn = async (assetId: string) => {
    setBusy(true);
    try {
      const r = await fetch("/api/inventory/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Return failed");
      await loadAssets();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const retireAsset = async (id: string) => {
    if (!confirm("Retire this asset? It will be hidden from active lists.")) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/inventory/assets/${id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      await loadAssets();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const loadHistory = async (asset: AssetRow) => {
    setHistoryFor(asset);
    const r = await fetch(`/api/inventory/assets/${asset._id}/assignments`);
    const d = await r.json();
    setHistory(d.assignments ?? []);
  };

  const assignedName = (a: AssetRow) => a.assignedTo?.name ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search tag, name, serial…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg"
          />
        </div>
        <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2">
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b._id} value={b._id}>{b.name}</option>
          ))}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2">
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>{c.label}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2">
          <option value="active">Active (excl. retired)</option>
          <option value="all">All statuses</option>
          <option value="available">Available</option>
          <option value="assigned">Assigned</option>
          <option value="maintenance">Maintenance</option>
          <option value="retired">Retired</option>
        </select>
        <button type="button" onClick={() => void refresh()} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
        <button type="button" onClick={openCreate} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: branding.brandColor }}>
          <Plus size={14} /> Add asset
        </button>
      </div>

      {msg && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{msg}</p>}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="text-left px-4 py-3">Tag / Name</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Branch</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Assigned to</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>
              ) : assets.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">No assets found.</td></tr>
              ) : (
                assets.map((a) => (
                  <tr key={a._id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-bold text-gray-800">{a.assetTag}</p>
                      <p className="text-gray-600">{a.name}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{categoryLabel(a.category, categories)}</td>
                    <td className="px-4 py-3 text-gray-600">{a.branch?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                        a.status === "available" ? "bg-emerald-100 text-emerald-800" :
                        a.status === "assigned" ? "bg-blue-100 text-blue-800" :
                        a.status === "maintenance" ? "bg-amber-100 text-amber-800" :
                        "bg-gray-100 text-gray-600"
                      }`}>{a.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{assignedName(a)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1 flex-wrap">
                        {a.status === "available" && (
                          <button type="button" onClick={() => { setAssignFor(a); setAssignUserId(""); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="Assign"><UserPlus size={15} /></button>
                        )}
                        {a.status === "assigned" && (
                          <button type="button" onClick={() => void doReturn(a._id)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="Return"><RotateCcw size={15} /></button>
                        )}
                        <button type="button" onClick={() => void loadHistory(a)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600" title="History"><History size={15} /></button>
                        <button type="button" onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600" title="Edit"><Pencil size={15} /></button>
                        {a.status !== "assigned" && a.status !== "retired" && (
                          <button type="button" onClick={() => void retireAsset(a._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Retire"><Trash2 size={15} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-[90] bg-black/30" onClick={() => setDrawerOpen(false)} aria-hidden />
          <div className="fixed inset-y-0 right-0 z-[95] w-full max-w-md bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-semibold text-gray-900">{editId ? "Edit asset" : "New asset"}</h2>
              <button type="button" onClick={() => setDrawerOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={saveAsset} className="flex-1 overflow-y-auto p-5 space-y-3">
              {[
                ["name", "Name *", "text"],
                ["assetTag", "Asset tag *", "text"],
                ["serialNumber", "Serial number", "text"],
                ["location", "Location (room/shelf)", "text"],
              ].map(([key, label, type]) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-gray-700">{label}</label>
                  <input
                    type={type}
                    required={label.includes("*")}
                    value={(form as Record<string, string | number>)[key] as string}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Category</label>
                  <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    {categories.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Branch</label>
                  <select value={form.branch} onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="">—</option>
                    {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Purchase date</label>
                  <input type="date" required value={form.purchaseDate} onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Price (₹)</label>
                  <input type="number" min={0} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Condition</label>
                  <select value={form.condition} onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="good">Good</option>
                    <option value="damaged">Damaged</option>
                    <option value="repair">Repair</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Status</label>
                  <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="available">Available</option>
                    {editId && form.status === "assigned" && <option value="assigned">Assigned</option>}
                    <option value="maintenance">Maintenance</option>
                    <option value="retired">Retired</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Warranty expiry</label>
                <input type="date" value={form.warrantyExpiry} onChange={(e) => setForm((f) => ({ ...f, warrantyExpiry: e.target.value }))} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <button type="submit" disabled={busy} className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: branding.brandColor }}>
                {busy ? "Saving…" : "Save asset"}
              </button>
            </form>
          </div>
        </>
      )}

      {assignFor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-semibold">Assign {assignFor.assetTag}</h3>
            <select value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="">Select user…</option>
              {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAssignFor(null)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
              <button type="button" disabled={!assignUserId || busy} onClick={() => void submitAssign()} className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50" style={{ backgroundColor: branding.brandColor }}>Assign</button>
            </div>
          </div>
        </div>
      )}

      {historyFor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold">Assignment history — {historyFor.assetTag}</h3>
              <button type="button" onClick={() => setHistoryFor(null)}><X size={18} /></button>
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-gray-500">No assignment records.</p>
            ) : (
              <ul className="space-y-3">
                {history.map((h) => (
                  <li key={h._id} className="text-sm border border-gray-100 rounded-lg p-3">
                    <p className="font-medium">{h.userId?.name ?? "User"}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(h.assignedDate).toLocaleDateString()}
                      {h.returnedDate ? ` → ${new Date(h.returnedDate).toLocaleDateString()}` : " · Active"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
