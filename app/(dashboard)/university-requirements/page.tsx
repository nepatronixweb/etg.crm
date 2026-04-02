"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ClipboardList, Globe, Loader2, Settings, ChevronRight, X } from "lucide-react";
import { useBranding } from "@/app/branding-context";
import { hasPermission } from "@/lib/utils";
import { normalizeUniversitiesArray, type UniversityEntry } from "@/lib/countryUniversities";
import { UniversityRequirementCard } from "@/lib/universityRequirementsUi";
import type { UserRole } from "@/types";

type CountryBlock = { name: string; universities: UniversityEntry[] };

export default function UniversityRequirementsPage() {
  const { data: session, status } = useSession();
  const branding = useBranding();
  const role = session?.user?.role as UserRole;
  const userPermissions = (session?.user?.permissions ?? []) as string[];
  const canView = hasPermission(userPermissions, "settings", role);

  const [countries, setCountries] = useState<CountryBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerCountry, setDrawerCountry] = useState<CountryBlock | null>(null);

  const closeDrawer = useCallback(() => setDrawerCountry(null), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const onWide = () => {
      if (mq.matches) setDrawerCountry(null);
    };
    mq.addEventListener("change", onWide);
    return () => mq.removeEventListener("change", onWide);
  }, []);

  useEffect(() => {
    if (!drawerCountry) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerCountry, closeDrawer]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (drawerCountry) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerCountry]);

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
        <>
          {/* Phone / tablet: open sidebar drawer with university cards (same entry as nav “University / colleges”) */}
          <div className="lg:hidden">
            <p className="text-sm text-gray-600 mb-4">
              Tap a country to open a side panel with each university / college card, including Find course and English requirements links.
            </p>
            <div className="space-y-2">
              {countries.map((country) => (
                <button
                  key={country.name}
                  type="button"
                  onClick={() => setDrawerCountry(country)}
                  className="w-full flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-left shadow-sm hover:border-gray-300 hover:bg-gray-50/80 transition-colors"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${branding.brandColor}18` }}
                  >
                    <Globe size={18} className="text-blue-500" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{country.name}</p>
                    <p className="text-xs text-gray-500 tabular-nums mt-0.5">
                      {country.universities.length}{" "}
                      {country.universities.length === 1 ? "university / college" : "universities / colleges"}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-gray-400 shrink-0" />
                </button>
              ))}
            </div>
            {drawerCountry && (
              <>
                <div
                  className="fixed inset-0 z-[100] bg-black/40 lg:hidden"
                  aria-hidden
                  onClick={closeDrawer}
                />
                <div className="fixed inset-y-0 right-0 z-[110] flex w-full max-w-xl flex-col border-l border-gray-200 bg-white shadow-2xl lg:hidden">
                  <div
                    className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-4 py-4"
                    style={{
                      background: `linear-gradient(135deg, ${branding.brandColor}12 0%, white 55%)`,
                    }}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                        style={{ backgroundColor: branding.brandColor }}
                      >
                        <Globe size={18} />
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">{drawerCountry.name}</h2>
                        <p className="text-xs text-gray-500 mt-1 tabular-nums">
                          {drawerCountry.universities.length}{" "}
                          {drawerCountry.universities.length === 1 ? "institution" : "institutions"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={closeDrawer}
                      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors shrink-0"
                      aria-label="Close"
                    >
                      <X size={22} />
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
                    {drawerCountry.universities.length === 0 ? (
                      <p className="text-sm text-gray-400 italic py-8 text-center">No universities listed for this country.</p>
                    ) : (
                      drawerCountry.universities.map((uni, idx) => (
                        <UniversityRequirementCard
                          key={`${drawerCountry.name}-${uni.name}-${idx}`}
                          uni={uni}
                          brandColor={branding.brandColor}
                        />
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="hidden lg:block space-y-12">
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
        </>
      )}
    </div>
  );
}
