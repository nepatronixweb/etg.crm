"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Boxes, User } from "lucide-react";

const tabs = [
  { href: "/inventory", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/inventory/assets", label: "Assets", icon: Package, exact: false },
  { href: "/inventory/stock", label: "Stock", icon: Boxes, exact: false },
  { href: "/inventory/my-assets", label: "My assets", icon: User, exact: false },
];

export default function InventoryNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 p-1 rounded-xl bg-gray-100/80 border border-gray-200/80">
      {tabs.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
              active
                ? "bg-white text-gray-900 shadow-sm border border-gray-200/80"
                : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
            }`}
          >
            <Icon size={14} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
