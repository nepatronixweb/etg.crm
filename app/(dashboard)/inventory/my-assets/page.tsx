"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Laptop, Loader2, Package } from "lucide-react";
import { useBranding } from "@/app/branding-context";

type AssetRow = {
  _id: string;
  name: string;
  category: string;
  assetTag: string;
  serialNumber?: string;
  condition: string;
  location?: string;
  purchaseDate?: string;
};

export default function MyAssetsPage() {
  const { data: session, status } = useSession();
  const branding = useBranding();
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    setLoading(true);
    fetch("/api/inventory/my-assets")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed");
        return d.assets as AssetRow[];
      })
      .then((list) => {
        if (!cancelled) setAssets(list || []);
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status === "loading") {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Laptop className="w-6 h-6 text-blue-600" />
          My assets
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Equipment currently assigned to you</p>
      </div>

      <Link
        href="/inventory"
        className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
        style={{ color: branding.brandColor }}
      >
        ← Inventory home
      </Link>

      {err && <p className="text-sm text-red-600">{err}</p>}

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : assets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-10 text-center">
          <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-600 font-medium">No assets assigned</p>
          <p className="text-sm text-gray-500 mt-1">When an admin assigns equipment to you, it will appear here.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {assets.map((a) => (
            <li
              key={a._id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
            >
              <div>
                <p className="font-mono text-xs font-bold text-blue-600">{a.assetTag}</p>
                <p className="text-base font-semibold text-gray-900 mt-1">{a.name}</p>
                <p className="text-xs text-gray-500 mt-1 capitalize">
                  {a.category} · Condition: {a.condition}
                </p>
                {a.location ? (
                  <p className="text-xs text-gray-500 mt-1">Location: {a.location}</p>
                ) : null}
                {a.serialNumber ? (
                  <p className="text-xs text-gray-400 mt-1 font-mono">S/N: {a.serialNumber}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
