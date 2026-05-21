"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Globe,
  Loader2,
  Palette,
  Sparkles,
  Tag,
} from "lucide-react";
import { BRAND_COLOR_PRESETS, normalizeHexColor } from "@/lib/brandTheme";
import { notifyAppSettingsChanged } from "@/lib/appSettingsSync";
import { useBrandingRefresh } from "@/app/branding-context";

type OnboardingSettings = {
  companyName: string;
  shortCode: string;
  tagline: string;
  brandColor: string;
  brandSecondaryColor: string;
  countries: string[];
  leadSources: string[];
};

const STEPS = [
  { id: "brand", title: "Brand identity", icon: Palette },
  { id: "lists", title: "Countries & sources", icon: Globe },
  { id: "done", title: "Ready to go", icon: Sparkles },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const refreshBranding = useBrandingRefresh();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [suggestedCountries, setSuggestedCountries] = useState<string[]>([]);
  const [suggestedLeadSources, setSuggestedLeadSources] = useState<string[]>([]);
  const [trialDays, setTrialDays] = useState(15);
  const [form, setForm] = useState<OnboardingSettings>({
    companyName: "",
    shortCode: "",
    tagline: "",
    brandColor: "#2563eb",
    brandSecondaryColor: "#1d4ed8",
    countries: [],
    leadSources: [],
  });

  useEffect(() => {
    fetch("/api/onboarding")
      .then((r) => r.json())
      .then((d) => {
        if (d.completed) {
          router.replace("/dashboard");
          return;
        }
        setSuggestedCountries(Array.isArray(d.suggestedCountries) ? d.suggestedCountries : []);
        setSuggestedLeadSources(Array.isArray(d.suggestedLeadSources) ? d.suggestedLeadSources : []);
        if (typeof d.trialDays === "number") setTrialDays(d.trialDays);
        const s = d.settings ?? {};
        setForm({
          companyName: s.companyName || d.organizationName || "",
          shortCode: s.shortCode || "",
          tagline: s.tagline || "",
          brandColor: s.brandColor || "#2563eb",
          brandSecondaryColor: s.brandSecondaryColor || "#1d4ed8",
          countries: Array.isArray(s.countries) ? s.countries.map((c: { name?: string } | string) => (typeof c === "string" ? c : c.name ?? "")).filter(Boolean) : [],
          leadSources: Array.isArray(s.leadSources) ? s.leadSources : [],
        });
      })
      .catch(() => setError("Could not load setup. Refresh the page."))
      .finally(() => setLoading(false));
  }, [router]);

  const toggleListItem = (key: "countries" | "leadSources", value: string) => {
    setForm((prev) => {
      const list = prev[key];
      return {
        ...prev,
        [key]: list.includes(value) ? list.filter((x) => x !== value) : [...list, value],
      };
    });
  };

  const saveStep = async (opts?: { complete?: boolean; skip?: boolean }) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          complete: opts?.complete ?? false,
          skip: opts?.skip ?? false,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Save failed.");
        return false;
      }
      notifyAppSettingsChanged();
      refreshBranding();
      if (opts?.complete) {
        await update();
        router.replace("/dashboard");
      }
      return true;
    } catch {
      setError("Network error. Try again.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    const ok = await saveStep();
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleFinish = () => saveStep({ complete: true });
  const handleSkipAll = () => saveStep({ complete: true, skip: true });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-500">
        <Loader2 className="animate-spin mr-2" size={20} />
        Preparing your workspace…
      </div>
    );
  }

  const primary = normalizeHexColor(form.brandColor);
  const secondary = normalizeHexColor(form.brandSecondaryColor || form.brandColor);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">Welcome</p>
        <h1 className="text-2xl font-bold text-gray-900">Set up your CRM</h1>
        <p className="text-sm text-gray-500 mt-1">
          {session?.user?.organizationName ?? "Your organization"} · {trialDays}-day free trial
        </p>
      </div>

      <div className="flex gap-2 mb-8">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = i === step;
          const done = i < step;
          return (
            <div
              key={s.id}
              className={`flex-1 rounded-xl border px-3 py-2.5 text-center text-xs font-medium transition-colors ${
                active
                  ? "border-blue-500 bg-blue-50 text-blue-800"
                  : done
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-gray-200 bg-gray-50 text-gray-500"
              }`}
            >
              <Icon size={16} className="mx-auto mb-1 opacity-80" />
              {s.title}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">Company name</label>
              <input
                value={form.companyName}
                onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                placeholder="Your agency name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">Short code</label>
                <input
                  value={form.shortCode}
                  onChange={(e) => setForm((f) => ({ ...f, shortCode: e.target.value.toUpperCase().slice(0, 5) }))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  placeholder="ETG"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">Tagline</label>
                <input
                  value={form.tagline}
                  onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  placeholder="Study abroad CRM"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Brand colors</label>
              <div className="grid grid-cols-4 gap-2">
                {BRAND_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        brandColor: preset.primary,
                        brandSecondaryColor: preset.secondary,
                      }))
                    }
                    className={`rounded-xl p-2 border text-left transition-all ${
                      form.brandColor === preset.primary
                        ? "border-blue-500 ring-2 ring-blue-200"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex gap-1 mb-1">
                      <span className="w-5 h-5 rounded-full" style={{ background: preset.primary }} />
                      <span className="w-5 h-5 rounded-full" style={{ background: preset.secondary }} />
                    </div>
                    <span className="text-[10px] text-gray-600">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div
              className="rounded-xl p-4 text-white text-sm"
              style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
            >
              <p className="font-bold text-lg">{form.companyName || "Your Company"}</p>
              <p className="text-white/80 text-xs mt-0.5">{form.tagline || "Your tagline appears here"}</p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Globe size={18} className="text-blue-600" />
                <h2 className="font-semibold text-gray-900">Destination countries</h2>
              </div>
              <p className="text-xs text-gray-500 mb-3">Select countries you recruit for. You can add more later in Settings.</p>
              <div className="flex flex-wrap gap-2">
                {suggestedCountries.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleListItem("countries", c)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      form.countries.includes(c)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Tag size={18} className="text-blue-600" />
                <h2 className="font-semibold text-gray-900">Lead sources</h2>
              </div>
              <p className="text-xs text-gray-500 mb-3">How do students usually find you?</p>
              <div className="flex flex-wrap gap-2">
                {suggestedLeadSources.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleListItem("leadSources", s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      form.leadSources.includes(s)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="text-center py-4">
            <CheckCircle2 size={48} className="mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">You&apos;re all set</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Your workspace is ready. Add your first lead from the dashboard, invite team members in Users, or
              fine-tune branding anytime in Settings.
            </p>
            <ul className="mt-6 text-left text-sm text-gray-600 space-y-2 max-w-sm mx-auto">
              <li className="flex gap-2">
                <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
                Brand identity saved for your team
              </li>
              <li className="flex gap-2">
                <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
                Empty lists — no other company&apos;s data
              </li>
              <li className="flex gap-2">
                <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
                {trialDays}-day trial with full module access
              </li>
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
          <div>
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={16} />
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSkipAll}
                disabled={saving}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Skip setup
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                Continue
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                Go to dashboard
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 mt-6">
        Need help?{" "}
        <Link href="/settings" className="text-blue-600 hover:underline">
          Open Settings
        </Link>{" "}
        anytime.
      </p>
    </div>
  );
}
