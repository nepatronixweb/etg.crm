"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  PackageCheck,
  Boxes,
  AlertTriangle,
  Wrench,
  IndianRupee,
  Building2,
  Settings2,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useBranding } from "@/app/branding-context";
import { useInventoryBranches, useInventoryConfig } from "./useInventoryHooks";
import type { InventoryCategoryDef } from "@/lib/inventoryConfig";

type Summary = {
  totalAssets: number;
  assignedCount: number;
  availableCount: number;
  maintenanceCount: number;
  totalAssetValue: number;
  lowStock: { _id: string; name: string; quantity: number; minStock: number; unit: string; branch?: { name?: string } }[];
  byBranch: { branchId: string | null; branchName: string; count: number; value: number }[];
};

export default function InventoryOverview() {
  const branding = useBranding();
  const branches = useInventoryBranches();
  const { config, reload: reloadConfig } = useInventoryConfig();
  const [branchFilter, setBranchFilter] = useState("");
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [editCategories, setEditCategories] = useState<InventoryCategoryDef[]>([]);
  const [editUnits, setEditUnits] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMsg, setConfigMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const q = branchFilter ? `?branch=${encodeURIComponent(branchFilter)}` : "";
    fetch(`/api/inventory/summary${q}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed");
        return d;
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchFilter]);

  const openConfig = () => {
    if (config) {
      setEditCategories([...config.categories]);
      setEditUnits(config.units.join(", "));
    }
    setConfigOpen(true);
    setConfigMsg(null);
  };

  const saveConfig = async () => {
    setSavingConfig(true);
    setConfigMsg(null);
    try {
      const units = editUnits.split(",").map((u) => u.trim()).filter(Boolean);
      const r = await fetch("/api/inventory/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: editCategories, units }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Save failed");
      await reloadConfig();
      setConfigOpen(false);
    } catch (e) {
      setConfigMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setSavingConfig(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-gray-400" />
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={openConfig}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50"
        >
          <Settings2 size={14} />
          Categories & units
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Total assets", value: data?.totalAssets ?? 0, icon: Package, color: "text-gray-900" },
          { label: "Assigned", value: data?.assignedCount ?? 0, icon: PackageCheck, color: "text-blue-700" },
          { label: "Available", value: data?.availableCount ?? 0, icon: Boxes, color: "text-emerald-700" },
          { label: "Maintenance", value: data?.maintenanceCount ?? 0, icon: Wrench, color: "text-amber-700" },
          {
            label: "Asset value",
            value: `₹${(data?.totalAssetValue ?? 0).toLocaleString("en-IN")}`,
            icon: IndianRupee,
            color: "text-gray-900",
            isText: true,
          },
        ].map(({ label, value, icon: Icon, color, isText }) => (
          <div key={label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <Icon className="w-4 h-4 text-gray-400 mb-2" />
            <p className={`text-2xl font-bold tabular-nums ${color}`}>{isText ? value : value}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Low stock items
          </h3>
          {(data?.lowStock.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-500">All stock levels are healthy.</p>
          ) : (
            <ul className="space-y-2">
              {data!.lowStock.slice(0, 8).map((s) => (
                <li key={s._id} className="flex justify-between text-sm">
                  <span className="font-medium text-gray-800">{s.name}</span>
                  <span className="text-amber-800 tabular-nums text-xs">
                    {s.quantity}/{s.minStock} {s.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/inventory/stock" className="inline-block mt-4 text-xs font-semibold hover:underline" style={{ color: branding.brandColor }}>
            Manage stock →
          </Link>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-500" />
            Assets by branch
          </h3>
          {(data?.byBranch.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-500">No assets registered yet.</p>
          ) : (
            <ul className="space-y-2">
              {data!.byBranch.slice(0, 8).map((b) => (
                <li key={b.branchId ?? "none"} className="flex justify-between text-sm">
                  <span className="text-gray-700">{b.branchName}</span>
                  <span className="text-gray-500 tabular-nums">
                    {b.count} · ₹{b.value.toLocaleString("en-IN")}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/inventory/assets" className="inline-block mt-4 text-xs font-semibold hover:underline" style={{ color: branding.brandColor }}>
            Manage assets →
          </Link>
        </div>
      </div>

      {configOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900">Inventory categories & units</h3>
            <p className="text-xs text-gray-500">Customize item categories and units of measure for your organization.</p>

            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase">Categories</p>
              {editCategories.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={c.label}
                    onChange={(e) => {
                      const next = [...editCategories];
                      next[i] = { ...next[i]!, label: e.target.value };
                      setEditCategories(next);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder="Label"
                  />
                  <span className="text-[10px] text-gray-400 font-mono self-center shrink-0">{c.slug}</span>
                  <button
                    type="button"
                    onClick={() => setEditCategories(editCategories.filter((_, j) => j !== i))}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setEditCategories([...editCategories, { slug: `cat_${editCategories.length + 1}`, label: "New category" }])}
                className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900"
              >
                <Plus size={12} /> Add category
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Units (comma-separated)</label>
              <input
                value={editUnits}
                onChange={(e) => setEditUnits(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder="pcs, box, pack"
              />
            </div>

            {configMsg && <p className="text-sm text-red-600">{configMsg}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setConfigOpen(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg">
                Cancel
              </button>
              <button
                type="button"
                disabled={savingConfig}
                onClick={() => void saveConfig()}
                className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
                style={{ backgroundColor: branding.brandColor }}
              >
                {savingConfig ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
