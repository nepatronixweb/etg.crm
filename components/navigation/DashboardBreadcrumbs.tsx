"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Home } from "lucide-react";

type Crumb = {
  href: string;
  label: string;
  isCurrent: boolean;
};

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  leads: "Leads",
  enquiries: "Enquiries",
  students: "Students",
  documents: "Documents",
  applications: "Applications",
  admissions: "Admissions",
  visa: "Visa",
  chat: "Chat",
  reports: "Analytics",
  branches: "Branches",
  users: "Users",
  "activity-logs": "Activity Logs",
  settings: "Settings",
  organizations: "Organizations",
  inventory: "Inventory",
  hr: "HR Management",
  commission: "Commission",
  "university-requirements": "University / Colleges",
  "my-assets": "My Assets",
};

const ROLE_SEGMENT_LABEL_OVERRIDES: Record<string, Partial<Record<string, string>>> = {
  telecaller: {
    dashboard: "Overview",
    leads: "Enquiries",
  },
};

function fallbackLabel(segment: string): string {
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isLikelyMongoId(segment: string): boolean {
  return /^[a-f0-9]{24}$/i.test(segment);
}

export default function DashboardBreadcrumbs() {
  const { data: session } = useSession();
  const pathname = usePathname() ?? "";
  const [dynamicLabel, setDynamicLabel] = useState<string | null>(null);
  const role = session?.user?.role ?? "";
  const shouldHide = pathname === "/dashboard";

  const segments = useMemo(
    () => pathname.split("/").filter(Boolean),
    [pathname]
  );

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setDynamicLabel(null);
      if (segments.length < 2) return;
      const last = segments[segments.length - 1];
      const parent = segments[segments.length - 2];
      if (!isLikelyMongoId(last)) return;
      if (!["leads", "enquiries", "students"].includes(parent)) return;

      const endpoint = `/api/${parent}/${last}`;
      try {
        const res = await fetch(endpoint, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const name = typeof data?.name === "string" ? data.name.trim() : "";
        if (!cancelled && name) setDynamicLabel(name);
      } catch {
        // Ignore breadcrumb name resolution errors.
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [segments]);

  const crumbs: Crumb[] = [];
  let runningPath = "";
  segments.forEach((segment, index) => {
    runningPath += `/${segment}`;
    const isCurrent = index === segments.length - 1;
    const previous = index > 0 ? segments[index - 1] : "";
    let label = SEGMENT_LABELS[segment] ?? fallbackLabel(segment);
    const roleOverride = ROLE_SEGMENT_LABEL_OVERRIDES[role]?.[segment];
    if (roleOverride) label = roleOverride;
    if (
      isCurrent &&
      dynamicLabel &&
      isLikelyMongoId(segment) &&
      ["leads", "enquiries", "students"].includes(previous)
    ) {
      label = dynamicLabel;
    } else if (isLikelyMongoId(segment)) {
      label = "Details";
    }
    crumbs.push({ href: runningPath, label, isCurrent });
  });

  if (shouldHide) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="no-print mb-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
    >
      <ol className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 overflow-x-auto whitespace-nowrap">
        <li>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 hover:text-gray-700 transition-colors"
          >
            <Home size={14} />
            <span>Home</span>
          </Link>
        </li>
        {crumbs.map((crumb) => (
          <li key={crumb.href} className="inline-flex items-center gap-1.5">
            <ChevronRight size={14} className="text-gray-300" />
            {crumb.isCurrent ? (
              <span className="font-medium text-gray-800">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="hover:text-gray-700 transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
