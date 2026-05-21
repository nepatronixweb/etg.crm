"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { Clock, X } from "lucide-react";
import { ORGANIZATION_TRIAL_DAYS } from "@/lib/organizationAccess";

type TrialBannerProps = {
  trialEndsAt: number;
  organizationName?: string | null;
};

function dismissKey(trialEndsAt: number) {
  return `etg-trial-banner-dismiss-${trialEndsAt}`;
}

export default function TrialBanner({ trialEndsAt, organizationName }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(dismissKey(trialEndsAt)) === "1";
  });

  const { daysLeft, endLabel, progressPct, urgency } = useMemo(() => {
    const end = new Date(trialEndsAt);
    const days = differenceInCalendarDays(end, new Date());
    const left = Math.max(0, days);
    const pct = Math.min(100, Math.max(0, ((ORGANIZATION_TRIAL_DAYS - left) / ORGANIZATION_TRIAL_DAYS) * 100));
    const label =
      days < 0
        ? "ended"
        : days === 0
          ? "ends today"
          : `${days} day${days === 1 ? "" : "s"} left`;
    const u = days <= 3 ? "high" : days <= 7 ? "medium" : "low";
    return {
      daysLeft: left,
      endLabel: label,
      progressPct: pct,
      urgency: u as "low" | "medium" | "high",
    };
  }, [trialEndsAt]);

  if (dismissed) return null;

  const tone =
    urgency === "high"
      ? "border-red-200 bg-red-50 text-red-950"
      : urgency === "medium"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-blue-200 bg-blue-50 text-blue-950";

  const barColor =
    urgency === "high" ? "bg-red-500" : urgency === "medium" ? "bg-amber-500" : "bg-blue-600";

  return (
    <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${tone}`}>
      <div className="flex items-start gap-3">
        <Clock size={18} className="shrink-0 mt-0.5 opacity-80" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold">
            Free trial — {endLabel}
            {organizationName ? ` · ${organizationName}` : ""}
          </p>
          <p className="text-xs mt-0.5 opacity-90">
            Trial ends {new Date(trialEndsAt).toLocaleDateString(undefined, { dateStyle: "medium" })}.
            {daysLeft <= 7 && " Upgrade before it expires to keep full access."}
          </p>
          <div className="mt-2.5 h-1.5 rounded-full bg-black/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[11px] mt-1 opacity-75">
            {daysLeft} of {ORGANIZATION_TRIAL_DAYS} days remaining
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/billing"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/80 hover:bg-white border border-black/10 transition-colors"
          >
            View plans
          </Link>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem(dismissKey(trialEndsAt), "1");
              setDismissed(true);
            }}
            className="p-1 rounded-md opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Dismiss trial banner"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
