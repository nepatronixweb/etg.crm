"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Package,
  Plus,
  RefreshCw,
  UserPlus,
  RotateCcw,
  Boxes,
  Loader2,
  X,
} from "lucide-react";
import { hasPermission } from "@/lib/utils";
import { useBranding } from "@/app/branding-context";
import type { UserRole } from "@/types";

type UserOpt = { _id: string; name: string; email: string };
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
  assignedTo?: UserOpt | null;
};

type StockRow = {
  _id: string;
  name: string;
  quantity: number;
  minStock: number;
  unit: string;
};

export default function InventoryPage() {
  const { data: session, status } = useSession();
  const branding = useBranding();
  const role = (session?.user?.role ?? "") as UserRole;
  const perms = (session?.user?.permissions ?? []) as string[];
  const canManage = hasPermission(perms, "inventory", role);

  const [stockDrawerOpen, setStockDrawerOpen] = useState(false);
  const [addAssetDrawerOpen, setAddAssetDrawerOpen] = useState(false);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [stock, setStock] = useState<StockRow[]>([]);
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [assignFor, setAssignFor] = useState<AssetRow | null>(null);
  const [assignUserId, setAssignUserId] = useState("");

  const [form, setForm] = useState({
    name: "",
    category: "electronics",
    assetTag: "",
    serialNumber: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
    price: 0,
    condition: "good",
    status: "available",
    location: "",
  });

  const [stockForm, setStockForm] = useState({ name: "", quantity: 0, minStock: 0, unit: "pcs" });

  const loadAssets = useCallback(async () => {
    const r = await fetch("/api/inventory/assets");
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Failed to load assets");
    setAssets(d.assets || []);
  }, []);

  const loadStock = useCallback(async () => {
    const r = await fetch("/api/inventory/stock");
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Failed to load stock");
    setStock(d.stock || []);
  }, []);

  const loadUsers = useCallback(async () => {
    const r = await fetch("/api/inventory/users");
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Failed to load users");
    setUsers(d.users || []);
  }, []);

  const refresh = useCallback(async () => {
    if (!canManage) return;
    setLoading(true);
    setMsg(null);
    try {
      await Promise.all([loadAssets(), loadUsers()]);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [canManage, loadAssets, loadUsers]);

  useEffect(() => {
    if (status === "authenticated" && canManage) void refresh();
    else setLoading(false);
  }, [status, canManage, refresh]);

  useEffect(() => {
    if (!stockDrawerOpen || !canManage) return;
    void loadStock();
  }, [stockDrawerOpen, canManage, loadStock]);

  useEffect(() => {
    if (!addAssetDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAddAssetDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [addAssetDrawerOpen]);

  useEffect(() => {
    if (!addAssetDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAddAssetDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addAssetDrawerOpen]);

  const createAsset = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/inventory/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Create failed");
      setForm((f) => ({
        ...f,
        name: "",
        assetTag: "",
        serialNumber: "",
        price: 0,
        location: "",
      }));
      setAddAssetDrawerOpen(false);
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
    setMsg(null);
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
    setMsg(null);
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

  const saveStockRow = async (row: StockRow) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/inventory/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row._id,
          name: row.name,
          quantity: row.quantity,
          minStock: row.minStock,
          unit: row.unit,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Save failed");
      await loadStock();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const addStock = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/inventory/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stockForm),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      setStockForm({ name: "", quantity: 0, minStock: 0, unit: "pcs" });
      await loadStock();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="max-w-lg mx-auto mt-12 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-800 font-medium">Inventory management is restricted.</p>
        <p className="text-sm text-gray-500 mt-2">You need the Inventory permission (or super admin).</p>
        <Link
          href="/inventory/my-assets"
          className="inline-block mt-6 text-sm font-semibold hover:underline"
          style={{ color: branding.brandColor }}
        >
          View my assigned assets →
        </Link>
      </div>
    );
  }

  const assignedName = (a: AssetRow) => {
    const u = a.assignedTo;
    if (u && typeof u === "object" && "name" in u) return u.name;
    return "-";
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-600" />
            Assets
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Office equipment - assign, return, track</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading || busy}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setAddAssetDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white shadow-sm shadow-black/10 hover:brightness-110 transition"
            style={{ backgroundColor: branding.brandColor }}
          >
            <Plus size={14} strokeWidth={2.5} />
            Add assets
          </button>
          <button
            type="button"
            onClick={() => setStockDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
          >
            <Boxes size={14} />
            Stock
          </button>
          <Link
            href="/inventory/my-assets"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            My assets
          </Link>
        </div>
      </div>

      {msg && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{msg}</p>}

      <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3">Tag</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Assigned</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                        Loading…
                      </td>
                    </tr>
                  ) : assets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                        No assets yet.
                      </td>
                    </tr>
                  ) : (
                    assets.map((a) => (
                      <tr key={a._id} className="hover:bg-gray-50/80">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800">{a.assetTag}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                        <td className="px-4 py-3 text-gray-600 capitalize">{a.category}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                              a.status === "available"
                                ? "bg-emerald-100 text-emerald-800"
                                : a.status === "assigned"
                                  ? "bg-blue-100 text-blue-800"
                                  : a.status === "maintenance"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {a.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{assignedName(a)}</td>
                        <td className="px-4 py-3 text-gray-500">{a.location || "-"}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                          {a.status === "available" && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                setAssignFor(a);
                                setAssignUserId("");
                              }}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                            >
                              <UserPlus size={12} />
                              Assign
                            </button>
                          )}
                          {a.status === "assigned" && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void doReturn(a._id)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:underline"
                            >
                              <RotateCcw size={12} />
                              Return
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      {stockDrawerOpen && (
        <>
          <div
            className="fixed inset-0 z-[100] bg-black/40"
            aria-hidden
            onClick={() => setStockDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-[110] w-full max-w-md bg-white border-l border-gray-200 shadow-2xl flex flex-col ring-1 ring-black/[0.04]">
            <div className="flex items-start justify-between gap-3 px-4 py-4 border-b border-gray-200 shrink-0 bg-gradient-to-r from-emerald-50/90 via-white to-white">
              <div className="flex items-start gap-3 min-w-0">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/20">
                  <Boxes className="w-5 h-5" strokeWidth={2.2} />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-gray-900 tracking-tight">Consumable stock</h2>
                  <p className="text-xs text-gray-600 mt-0.5 leading-snug">
                    Add lines and edit quantities. Low stock rows are highlighted.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStockDrawerOpen(false)}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors shrink-0"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
              <form
                onSubmit={addStock}
                className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 space-y-4 shadow-sm ring-1 ring-black/[0.03]"
              >
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800/85">Add line</p>
                  <p className="text-xs text-gray-600 mt-1">New consumable row - saved with the list below.</p>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="stock-new-name" className="text-xs font-semibold text-gray-700">
                    Item name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="stock-new-name"
                    required
                    placeholder="e.g. A4 paper ream"
                    value={stockForm.name}
                    onChange={(e) => setStockForm((s) => ({ ...s, name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="stock-new-qty" className="text-xs font-semibold text-gray-700">
                      Qty
                    </label>
                    <input
                      id="stock-new-qty"
                      type="number"
                      min={0}
                      placeholder="0"
                      value={stockForm.quantity === 0 ? "" : stockForm.quantity}
                      onChange={(e) => {
                        const v = e.target.value;
                        setStockForm((s) => ({
                          ...s,
                          quantity: v === "" ? 0 : Math.max(0, Number(v) || 0),
                        }));
                      }}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm tabular-nums text-gray-900 placeholder:text-gray-500 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="stock-new-min" className="text-xs font-semibold text-gray-700">
                      Min
                    </label>
                    <input
                      id="stock-new-min"
                      type="number"
                      min={0}
                      placeholder="0"
                      value={stockForm.minStock === 0 ? "" : stockForm.minStock}
                      onChange={(e) => {
                        const v = e.target.value;
                        setStockForm((s) => ({
                          ...s,
                          minStock: v === "" ? 0 : Math.max(0, Number(v) || 0),
                        }));
                      }}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm tabular-nums text-gray-900 placeholder:text-gray-500 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="stock-new-unit" className="text-xs font-semibold text-gray-700">
                      Unit
                    </label>
                    <input
                      id="stock-new-unit"
                      placeholder="pcs"
                      value={stockForm.unit}
                      onChange={(e) => setStockForm((s) => ({ ...s, unit: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-black/10 transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
                  style={{ backgroundColor: branding.brandColor }}
                >
                  Add stock line
                </button>
              </form>

              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm ring-1 ring-black/[0.03]">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200 text-left">
                      <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-gray-600">Item</th>
                      <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-gray-600">Qty</th>
                      <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-gray-600">Min</th>
                      <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-gray-600">Unit</th>
                      <th className="px-2 py-2.5 w-14" aria-label="Save" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stock.map((s) => (
                      <StockEditRow key={s._id} row={s} disabled={busy} onSave={saveStockRow} compact />
                    ))}
                  </tbody>
                </table>
                {stock.length === 0 && (
                  <div className="px-4 py-10 text-center border-t border-gray-100 bg-gray-50/50">
                    <Boxes className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-700">No consumables yet</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-[220px] mx-auto">
                      Use the form above to add your first stock line.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {addAssetDrawerOpen && (
        <>
          <div
            className="fixed inset-0 z-[100] bg-black/40"
            aria-hidden
            onClick={() => setAddAssetDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-[110] w-full max-w-3xl bg-white border-l border-gray-200 shadow-2xl flex flex-col">
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50/80 via-white to-white shrink-0">
              <div className="flex items-start gap-3 min-w-0">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/25">
                  <Plus className="w-5 h-5" strokeWidth={2.5} />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Add new asset</h2>
                  <p className="text-xs text-gray-600 mt-1 max-w-md">
                    Register equipment - tag, assign, and track from the list on the main page.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddAssetDrawerOpen(false)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 shrink-0"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>
            <form
              onSubmit={createAsset}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-8">
                <div className="space-y-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800/80">Identification</p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    <div className="space-y-1.5">
                      <label htmlFor="drawer-asset-name" className="text-xs font-semibold text-gray-700">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="drawer-asset-name"
                        required
                        placeholder='e.g. Dell laptop 15"'
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="drawer-asset-tag" className="text-xs font-semibold text-gray-700">
                        Asset tag <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="drawer-asset-tag"
                        required
                        placeholder="Unique code, e.g. ETG-LAP-001"
                        value={form.assetTag}
                        onChange={(e) => setForm((f) => ({ ...f, assetTag: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-mono text-gray-900 placeholder:text-gray-500 placeholder:font-sans shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="drawer-asset-serial" className="text-xs font-semibold text-gray-700">
                        Serial number
                      </label>
                      <input
                        id="drawer-asset-serial"
                        placeholder="Optional manufacturer serial"
                        value={form.serialNumber}
                        onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800/80">Purchase & category</p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    <div className="space-y-1.5">
                      <label htmlFor="drawer-asset-category" className="text-xs font-semibold text-gray-700">
                        Category
                      </label>
                      <select
                        id="drawer-asset-category"
                        value={form.category}
                        onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="electronics">Electronics</option>
                        <option value="furniture">Furniture</option>
                        <option value="tools">Tools</option>
                        <option value="others">Others</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="drawer-asset-purchase-date" className="text-xs font-semibold text-gray-700">
                        Purchase date <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="drawer-asset-purchase-date"
                        type="date"
                        required
                        value={form.purchaseDate}
                        onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="drawer-asset-price" className="text-xs font-semibold text-gray-700">
                        Price
                      </label>
                      <input
                        id="drawer-asset-price"
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        value={form.price || ""}
                        onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm tabular-nums text-gray-900 placeholder:text-gray-500 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800/80">Status & location</p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    <div className="space-y-1.5">
                      <label htmlFor="drawer-asset-condition" className="text-xs font-semibold text-gray-700">
                        Condition
                      </label>
                      <select
                        id="drawer-asset-condition"
                        value={form.condition}
                        onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="good">Good</option>
                        <option value="damaged">Damaged</option>
                        <option value="repair">Repair</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="drawer-asset-status" className="text-xs font-semibold text-gray-700">
                        Status
                      </label>
                      <select
                        id="drawer-asset-status"
                        value={form.status}
                        onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="available">Available</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="retired">Retired</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                      <label htmlFor="drawer-asset-location" className="text-xs font-semibold text-gray-700">
                        Location
                      </label>
                      <input
                        id="drawer-asset-location"
                        placeholder="Building, room, or shelf"
                        value={form.location}
                        onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-gray-100 bg-gray-50/80 px-5 py-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-xs text-gray-500">
                  <span className="text-red-500 font-semibold">*</span> Required fields · Esc to close
                </p>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-black/10 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
                  style={{ backgroundColor: branding.brandColor }}
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Package className="w-4 h-4 opacity-90" />
                      Save asset
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {assignFor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Assign asset</h3>
            <p className="text-sm text-gray-600">
              <span className="font-mono font-semibold">{assignFor.assetTag}</span> - {assignFor.name}
            </p>
            <select
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="">Select user…</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssignFor(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!assignUserId || busy}
                onClick={() => void submitAssign()}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: branding.brandColor }}
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StockEditRow({
  row,
  disabled,
  onSave,
  compact,
}: {
  row: StockRow;
  disabled: boolean;
  onSave: (r: StockRow) => void;
  compact?: boolean;
}) {
  const [local, setLocal] = useState(row);
  useEffect(() => {
    setLocal(row);
  }, [row]);

  const low = local.quantity < local.minStock;
  const cell = compact ? "px-2 py-1.5" : "px-4 py-2";

  const inp =
    "rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder:text-gray-500";

  return (
    <tr className={`${low ? "bg-amber-50/60" : "hover:bg-slate-50/80"} transition-colors`}>
      <td className={cell}>
        <input
          value={local.name}
          onChange={(e) => setLocal((l) => ({ ...l, name: e.target.value }))}
          className={`w-full px-2 py-1.5 text-sm ${inp} ${compact ? "text-xs" : ""}`}
        />
      </td>
      <td className={cell}>
        <input
          type="number"
          min={0}
          value={local.quantity}
          onChange={(e) => setLocal((l) => ({ ...l, quantity: Number(e.target.value) }))}
          className={`tabular-nums text-sm ${inp} ${compact ? "w-[4.25rem] px-2 py-1.5 text-xs" : "w-24 px-2 py-1.5"}`}
        />
      </td>
      <td className={cell}>
        <input
          type="number"
          min={0}
          value={local.minStock}
          onChange={(e) => setLocal((l) => ({ ...l, minStock: Number(e.target.value) }))}
          className={`tabular-nums text-sm ${inp} ${compact ? "w-[4.25rem] px-2 py-1.5 text-xs" : "w-24 px-2 py-1.5"}`}
        />
      </td>
      <td className={cell}>
        <input
          value={local.unit}
          onChange={(e) => setLocal((l) => ({ ...l, unit: e.target.value }))}
          className={`text-sm ${inp} ${compact ? "w-16 px-2 py-1.5 text-xs" : "w-20 px-2 py-1.5"}`}
        />
      </td>
      <td className={`${cell} text-right`}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSave(local)}
          className="inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 disabled:opacity-40"
        >
          Save
        </button>
      </td>
    </tr>
  );
}
