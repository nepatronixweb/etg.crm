"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus, RefreshCw, Loader2, ArrowDownCircle, ArrowUpCircle, Sliders, Truck, Trash2, Pencil } from "lucide-react";
import { useBranding } from "@/app/branding-context";
import { categoryLabel, useInventoryBranches, useInventoryConfig } from "./useInventoryHooks";

type StockRow = {
  _id: string;
  name: string;
  sku?: string;
  category: string;
  quantity: number;
  minStock: number;
  unit: string;
  notes?: string;
  branch?: { _id?: string; name?: string } | null;
};

type MovementRow = {
  _id: string;
  type: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string;
  createdAt: string;
  stockItemId?: { name?: string; unit?: string };
  performedBy?: { name?: string };
  targetBranch?: { name?: string };
};

export default function StockManager() {
  const branding = useBranding();
  const branches = useInventoryBranches();
  const { config } = useInventoryConfig();
  const categories = config?.categories ?? [];
  const units = config?.units ?? ["pcs"];

  const [stock, setStock] = useState<StockRow[]>([]);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", sku: "", category: "others", quantity: 0, minStock: 0, unit: "pcs", notes: "", branch: "" });
  const [moveFor, setMoveFor] = useState<StockRow | null>(null);
  const [moveType, setMoveType] = useState<"in" | "out" | "adjust" | "transfer">("in");
  const [moveQty, setMoveQty] = useState(1);
  const [moveReason, setMoveReason] = useState("");
  const [targetBranch, setTargetBranch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const stockQuery = useCallback(() => {
    const p = new URLSearchParams();
    if (branchFilter) p.set("branch", branchFilter);
    if (debouncedSearch) p.set("search", debouncedSearch);
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [branchFilter, debouncedSearch]);

  const loadStock = useCallback(async () => {
    const r = await fetch(`/api/inventory/stock${stockQuery()}`);
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Failed");
    setStock(d.stock || []);
  }, [stockQuery]);

  const loadMovements = useCallback(async () => {
    const r = await fetch("/api/inventory/stock/movements");
    const d = await r.json();
    if (r.ok) setMovements(d.movements || []);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadStock(), loadMovements()]);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [loadStock, loadMovements]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openCreate = () => {
    setEditId(null);
    setForm({ name: "", sku: "", category: categories[0]?.slug ?? "others", quantity: 0, minStock: 5, unit: units[0] ?? "pcs", notes: "", branch: "" });
    setFormOpen(true);
  };

  const openEdit = (row: StockRow) => {
    setEditId(row._id);
    setForm({
      name: row.name,
      sku: row.sku ?? "",
      category: row.category,
      quantity: row.quantity,
      minStock: row.minStock,
      unit: row.unit,
      notes: row.notes ?? "",
      branch: row.branch?._id ?? "",
    });
    setFormOpen(true);
  };

  const saveItem = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (editId) {
        const r = await fetch(`/api/inventory/stock/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, branch: form.branch || null }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed");
      } else {
        const r = await fetch("/api/inventory/stock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, branch: form.branch || null }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed");
      }
      setFormOpen(false);
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const submitMovement = async () => {
    if (!moveFor) return;
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        stockItemId: moveFor._id,
        type: moveType,
        quantity: moveType === "adjust" ? moveQty : moveQty,
        reason: moveReason,
      };
      if (moveType === "transfer") body.targetBranchId = targetBranch;
      const r = await fetch("/api/inventory/stock/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Movement failed");
      setMoveFor(null);
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this stock item?")) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/inventory/stock/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error || "Failed");
      }
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const moveIcon = (t: string) => {
    if (t === "in") return <ArrowDownCircle size={14} className="text-emerald-600" />;
    if (t === "out") return <ArrowUpCircle size={14} className="text-red-500" />;
    if (t === "transfer") return <Truck size={14} className="text-blue-600" />;
    return <Sliders size={14} className="text-amber-600" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 items-center">
        <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search name or SKU…" className="flex-1 min-w-[160px] px-3 py-2 text-sm border border-gray-200 rounded-lg" />
        <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2">
          <option value="">All branches</option>
          {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        <button type="button" onClick={() => void refresh()} className="p-2 border border-gray-200 rounded-lg"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /></button>
        <button type="button" onClick={openCreate} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: branding.brandColor }}>
          <Plus size={14} /> Add item
        </button>
      </div>

      {msg && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{msg}</p>}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-[10px] font-bold uppercase text-gray-500">
            <tr>
              <th className="text-left px-4 py-3">Item</th>
              <th className="text-left px-4 py-3">Branch</th>
              <th className="text-left px-4 py-3">Qty</th>
              <th className="text-left px-4 py-3">Min</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></td></tr>
            ) : stock.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-gray-500">No stock items.</td></tr>
            ) : (
              stock.map((s) => {
                const low = s.quantity < s.minStock;
                return (
                  <tr key={s._id} className={low ? "bg-amber-50/40" : ""}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{s.name}</p>
                      <p className="text-xs text-gray-500">{categoryLabel(s.category, categories)}{s.sku ? ` · ${s.sku}` : ""}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.branch?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold tabular-nums ${low ? "text-amber-800" : "text-gray-900"}`}>{s.quantity}</span>
                      <span className="text-gray-400 text-xs ml-1">{s.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 tabular-nums">{s.minStock}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => { setMoveFor(s); setMoveType("in"); setMoveQty(1); setMoveReason(""); }} className="px-2 py-1 text-[10px] font-bold rounded bg-emerald-50 text-emerald-700">IN</button>
                        <button type="button" onClick={() => { setMoveFor(s); setMoveType("out"); setMoveQty(1); }} className="px-2 py-1 text-[10px] font-bold rounded bg-red-50 text-red-700">OUT</button>
                        <button type="button" onClick={() => openEdit(s)} className="p-1.5 hover:bg-gray-100 rounded-lg"><Pencil size={14} /></button>
                        <button type="button" onClick={() => void deleteItem(s._id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Recent movements</h3>
        {movements.length === 0 ? (
          <p className="text-sm text-gray-500">No movements yet.</p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {movements.slice(0, 20).map((m) => (
              <li key={m._id} className="flex items-start gap-2 text-sm border-b border-gray-50 pb-2">
                {moveIcon(m.type)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{m.stockItemId?.name ?? "Item"}</p>
                  <p className="text-xs text-gray-500">
                    {m.type.toUpperCase()} · {m.previousQuantity} → {m.newQuantity} {m.stockItemId?.unit ?? ""}
                    {m.performedBy?.name ? ` · ${m.performedBy.name}` : ""}
                    {m.targetBranch?.name ? ` → ${m.targetBranch.name}` : ""}
                  </p>
                  {m.reason && <p className="text-xs text-gray-400 italic">{m.reason}</p>}
                </div>
                <span className="text-[10px] text-gray-400 shrink-0">{new Date(m.createdAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
          <form onSubmit={saveItem} className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold">{editId ? "Edit stock item" : "New stock item"}</h3>
            <input required placeholder="Name *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" />
            <input placeholder="SKU (optional)" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm">
                {categories.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
              </select>
              <select value={form.branch} onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm">
                <option value="">Branch</option>
                {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
            {!editId && (
              <input type="number" min={0} placeholder="Initial quantity" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg text-sm" />
            )}
            <div className="grid grid-cols-2 gap-2">
              <input type="number" min={0} placeholder="Min stock" value={form.minStock} onChange={(e) => setForm((f) => ({ ...f, minStock: Number(e.target.value) }))} className="px-3 py-2 border rounded-lg text-sm" />
              <select value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm">
                {units.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
              <button type="submit" disabled={busy} className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50" style={{ backgroundColor: branding.brandColor }}>Save</button>
            </div>
          </form>
        </div>
      )}

      {moveFor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-3">
            <h3 className="font-semibold">Stock movement — {moveFor.name}</h3>
            <select value={moveType} onChange={(e) => setMoveType(e.target.value as typeof moveType)} className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="in">Stock in</option>
              <option value="out">Stock out</option>
              <option value="adjust">Adjust to quantity</option>
              <option value="transfer">Transfer to branch</option>
            </select>
            <input type="number" min={0} value={moveQty} onChange={(e) => setMoveQty(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder={moveType === "adjust" ? "New quantity" : "Quantity"} />
            {moveType === "transfer" && (
              <select value={targetBranch} onChange={(e) => setTargetBranch(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">Target branch</option>
                {branches.filter((b) => b._id !== moveFor.branch?._id).map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            )}
            <input value={moveReason} onChange={(e) => setMoveReason(e.target.value)} placeholder="Reason (optional)" className="w-full px-3 py-2 border rounded-lg text-sm" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setMoveFor(null)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
              <button type="button" disabled={busy} onClick={() => void submitMovement()} className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50" style={{ backgroundColor: branding.brandColor }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
