"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Boxes, Package, PackageCheck, AlertTriangle } from "lucide-react";

type Summary = {
  totalAssets: number;
  assignedCount: number;
  availableCount: number;
  lowStock: { _id: string; name: string; quantity: number; minStock: number; unit: string }[];
};

export default function InventorySummaryWidgets() {
  const [data, setData] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/inventory/summary")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed");
        return d;
      })
      .then((d) => {
        if (cancelled) return;
        setData({
          totalAssets: d.totalAssets ?? 0,
          assignedCount: d.assignedCount ?? 0,
          availableCount: d.availableCount ?? 0,
          lowStock: Array.isArray(d.lowStock) ? d.lowStock : [],
        });
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (err) return null;
  if (!data) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-50 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/50 via-white to-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Boxes className="w-5 h-5 text-emerald-600" />
          <h2 className="text-sm font-bold text-gray-900">Inventory snapshot</h2>
        </div>
        <Link href="/inventory" className="text-xs font-semibold text-emerald-700 hover:underline">
          Manage →
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <Package className="w-4 h-4 text-gray-400 mb-2" />
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{data.totalAssets}</p>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Total assets</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <PackageCheck className="w-4 h-4 text-blue-500 mb-2" />
          <p className="text-2xl font-bold text-blue-700 tabular-nums">{data.assignedCount}</p>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Assigned</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <Boxes className="w-4 h-4 text-emerald-500 mb-2" />
          <p className="text-2xl font-bold text-emerald-700 tabular-nums">{data.availableCount}</p>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Available</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/80 p-4">
          <AlertTriangle className="w-4 h-4 text-amber-600 mb-2" />
          <p className="text-2xl font-bold text-amber-800 tabular-nums">{data.lowStock.length}</p>
          <p className="text-[11px] font-semibold text-amber-800/80 uppercase tracking-wide">Low stock SKUs</p>
        </div>
      </div>
      {data.lowStock.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Below minimum</p>
          <ul className="flex flex-wrap gap-2">
            {data.lowStock.slice(0, 8).map((s) => (
              <li
                key={s._id}
                className="text-xs px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-medium"
              >
                {s.name}{" "}
                <span className="tabular-nums opacity-80">
                  ({s.quantity}/{s.minStock} {s.unit})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
