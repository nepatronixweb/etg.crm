"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Loader2, Package } from "lucide-react";
import { hasPermission } from "@/lib/utils";
import type { UserRole } from "@/types";
import AssetsManager from "@/components/inventory/AssetsManager";

export default function InventoryAssetsPage() {
  const { data: session, status } = useSession();
  const role = (session?.user?.role ?? "") as UserRole;
  const perms = (session?.user?.permissions ?? []) as string[];
  const canManage = hasPermission(perms, "inventory", role);

  if (status === "loading") {
    return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
  }

  if (!canManage) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-800 font-medium">You need Inventory permission to manage assets.</p>
        <Link href="/inventory/my-assets" className="inline-block mt-4 text-sm font-semibold text-emerald-700 hover:underline">My assets →</Link>
      </div>
    );
  }

  return <AssetsManager />;
}
