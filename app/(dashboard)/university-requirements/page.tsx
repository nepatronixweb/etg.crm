"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ClipboardList, Globe, Loader2, Settings } from "lucide-react";
import { useBranding } from "@/app/branding-context";
import { hasPermission } from "@/lib/utils";
import { normalizeUniversitiesArray, type UniversityEntry } from "@/lib/countryUniversities";
import { UniversityRequirementCard } from "@/lib/universityRequirementsUi";
import type { UserRole } from "@/types";

export default function UniversityRequirementsPage() {
  const { data: session, status } = useSession();
  const branding = useBranding();
  const role = session?.user?.role as UserRole;
  const userPermissions = (session?.user?.permissions ?? []) as string[];
  const canView = hasPermission(userPermissions, "settings", role);

  const [countries, setCountries] = useState<{ name: string; universities: UniversityEntry[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading" || !canView) return;
    let cancelled = false;
    setLoading(true);
    fetch("/api/settings/app")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !Array.isArray(d?.countries)) return;
        const list = d.countries.map(
          (c: string | { name: string; universities?: unknown }) =>
            typeof c === "string"
              ? { name: c, universities: [] as UniversityEntry[] }
              : { name: c.name, universities: normalizeUniversitiesArray(c.universities) }
        );
        setCountries(list);
      })
      .catch(() => {
        if (!cancelled) setCountries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, canView]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-gray-500">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: branding.brandColor }} />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="max-w-lg mx-auto mt-16 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <p className="text-gray-800 font-medium">You don&apos;t have access to this page.</p>
        <p className="text-sm text-gray-500 mt-2">This page is available to users with Settings access.</p>
        <Link href="/dashboard" className="inline-block mt-6 text-sm font-semibold hover:underline" style={{ color: branding.brandColor }}>
          Back to dashboard
        </Link>
      </div>
    );
  }

  const totalUnis = countries.reduce((n, c) => n + c.universities.length, 0);

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <header className="mb-8 rounded-2xl border border-gray-200/90 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4 min-w-0">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
              style={{ backgroundColor: `${branding.brandColor}18` }}
            >
              <ClipboardList className="w-6 h-6" style={{ color: branding.brandColor }} />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">University / colleges</h1>
              <p className="text-sm text-gray-500 mt-1">
                Requirements and reference documents for each university or college, grouped by destination country. Data comes from{" "}
                <span className="text-gray-700 font-medium">Settings → Countries & Services</span>.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {countries.length} {countries.length === 1 ? "country" : "countries"} · {totalUnis}{" "}
                {totalUnis === 1 ? "university / college" : "universities / colleges"}
              </p>
            </div>
          </div>
          <Link
            href="/settings"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 shrink-0"
            style={{ backgroundColor: branding.brandColor }}
          >
            <Settings size={16} />
            Edit in Settings
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-500">
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: branding.brandColor }} />
          <p className="text-sm">Loading universities / colleges…</p>
        </div>
      ) : countries.length === 0 ? (
        <p className="text-center text-gray-500 py-20">No destination countries configured.</p>
      ) : (
        <div className="space-y-12">
          {countries.map((country) => (
            <section key={country.name} className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 gap-y-1 border-b border-gray-200 pb-3">
                <Globe size={18} className="text-blue-500 shrink-0" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">{country.name}</h2>
                <span className="text-xs font-semibold text-gray-400 tabular-nums">
                  {country.universities.length}{" "}
                  {country.universities.length === 1 ? "university / college" : "universities / colleges"}
                </span>
              </div>
              {country.universities.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No universities or colleges listed for this country.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {country.universities.map((uni, idx) => (
                    <UniversityRequirementCard
                      key={`${country.name}-${uni.name}-${idx}`}
                      uni={uni}
                      brandColor={branding.brandColor}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
