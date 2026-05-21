"use client";

import { useCallback, useEffect, useState } from "react";
import type { InventoryCategoryDef } from "@/lib/inventoryConfig";

export type InventoryConfigState = {
  categories: InventoryCategoryDef[];
  units: string[];
};

export function useInventoryConfig() {
  const [config, setConfig] = useState<InventoryConfigState | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/inventory/config");
      const d = await r.json();
      if (r.ok) {
        setConfig({ categories: d.categories ?? [], units: d.units ?? [] });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { config, loading, reload, setConfig };
}

export function useInventoryBranches() {
  const [branches, setBranches] = useState<{ _id: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/branches")
      .then((r) => r.json())
      .then((d) => setBranches(Array.isArray(d) ? d : []))
      .catch(() => setBranches([]));
  }, []);

  return branches;
}

export function categoryLabel(slug: string, categories: InventoryCategoryDef[]): string {
  return categories.find((c) => c.slug === slug)?.label ?? slug.replace(/_/g, " ");
}
