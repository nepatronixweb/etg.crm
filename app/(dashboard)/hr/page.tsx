"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Loader2, Briefcase } from "lucide-react";
import HrAdminPanel from "@/components/hr/HrAdminPanel";
import { useBranding } from "@/app/branding-context";
import type { UserRole } from "@/types";

function canViewHrManagement(session: ReturnType<typeof useSession>["data"]): boolean {
  if (!session?.user) return false;
  const role = session.user.role as UserRole;
  if (role === "super_admin") return true;
  return session.user.hrRole === "admin";
}

export default function HrManagementPage() {
  const { data: session, status } = useSession();
  const branding = useBranding();

  if (status === "loading") {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!canViewHrManagement(session)) {
    return (
      <div className="max-w-lg mx-auto mt-12 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-800 font-medium">HR management is restricted.</p>
        <p className="text-sm text-gray-500 mt-2">Only super admins and HR administrators can open this page.</p>
        <Link
          href="/dashboard"
          className="inline-block mt-6 text-sm font-semibold hover:underline"
          style={{ color: branding.brandColor }}
        >
          Back to dashboard →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <HrAdminPanel />
    </div>
  );
}
