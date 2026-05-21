"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Package, Loader2 } from "lucide-react";
import { hasPermission } from "@/lib/utils";
import type { UserRole } from "@/types";
import InventoryNav from "@/components/inventory/InventoryNav";

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const role = (session?.user?.role ?? "") as UserRole;
  const perms = (session?.user?.permissions ?? []) as string[];
  const canManage = hasPermission(perms, "inventory", role);

  if (status === "loading") {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-600" />
            Inventory
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Office assets, consumables & branch stock</p>
        </div>
        {!canManage && (
          <Link href="/inventory/my-assets" className="text-sm font-semibold text-emerald-700 hover:underline">
            View my assigned assets →
          </Link>
        )}
      </div>

      <InventoryNav />
      {children}
    </div>
  );
}
