"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { CreditCard, LogOut, Loader2, Mail, ArrowLeft, Users, Building2, UserPlus } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import { ORGANIZATION_TRIAL_DAYS } from "@/lib/organizationAccess";

type UsageRow = {
  key: string;
  label: string;
  icon: typeof Users;
  used: number;
  limit: number | null;
};

type BillingData = {
  organizationName: string;
  plan: string;
  planLabel: string;
  planDescription: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  paidThrough: string | null;
  orgAccessAllowed: boolean;
  usage: { users: number; branches: number; leads: number };
  limits: { users: number | null; branches: number | null; leads: number | null };
  contactEmail: string;
  plans: {
    id: string;
    label: string;
    description: string;
    maxUsers: number | null;
    maxBranches: number | null;
    maxLeads: number | null;
  }[];
};

function usagePct(used: number, limit: number | null): number {
  if (limit == null || limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function UsageBar({ row }: { row: UsageRow }) {
  const Icon = row.icon;
  const pct = usagePct(row.used, row.limit);
  const atLimit = row.limit != null && row.used >= row.limit;
  const nearLimit = row.limit != null && row.used >= row.limit * 0.85;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon size={16} className="text-white/70" />
          {row.label}
        </div>
        <span className="text-xs text-white/60">
          {row.used.toLocaleString()}
          {row.limit != null ? ` / ${row.limit.toLocaleString()}` : " · Unlimited"}
        </span>
      </div>
      {row.limit != null && (
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${atLimit ? "bg-red-400" : nearLimit ? "bg-amber-400" : "bg-emerald-400"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }
    fetch("/api/billing")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
          return;
        }
        if (!d.organizationName && d.role === "super_admin") {
          setError("super_admin");
          return;
        }
        setData(d as BillingData);
      })
      .catch(() => setError("Could not load billing information."))
      .finally(() => setLoading(false));
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400 text-sm">
        <Loader2 className="animate-spin mr-2" size={18} />
        Loading billing…
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <Link href="/login" className="text-blue-400 hover:underline text-sm">
          Sign in
        </Link>
      </div>
    );
  }

  if (session.user.role === "super_admin" || error === "super_admin") {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
        <p className="text-sm text-slate-300 mb-4">Manage tenant plans from Organizations.</p>
        <Link href="/organizations" className="text-blue-400 hover:underline text-sm font-medium">
          Go to Organizations & billing
        </Link>
      </div>
    );
  }

  const blocked = data ? !data.orgAccessAllowed : !session.user.orgAccessAllowed;
  const orgName = data?.organizationName ?? session.user.organizationName ?? "Your organization";
  const trialDaysLeft =
    data?.trialEndsAt != null
      ? differenceInCalendarDays(new Date(data.trialEndsAt), new Date())
      : session.user.orgTrialEndsAt
        ? differenceInCalendarDays(new Date(session.user.orgTrialEndsAt), new Date())
        : null;

  const usageRows: UsageRow[] = data
    ? [
        { key: "users", label: "Team members", icon: Users, used: data.usage.users, limit: data.limits.users },
        { key: "branches", label: "Branches", icon: Building2, used: data.usage.branches, limit: data.limits.branches },
        { key: "leads", label: "Leads", icon: UserPlus, used: data.usage.leads, limit: data.limits.leads },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to dashboard
        </Link>

        <div className="flex items-start gap-4 mb-8">
          <div className="p-3 rounded-2xl bg-white/10">
            <CreditCard size={28} className="text-amber-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{blocked ? "Subscription required" : "Plan & billing"}</h1>
            <p className="text-sm text-slate-400 mt-1">{orgName}</p>
          </div>
        </div>

        {error && error !== "super_admin" && (
          <div className="mb-6 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {blocked && (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-5 py-4 mb-6 text-sm text-amber-100 leading-relaxed">
            Access is paused. Your free trial may have ended, or the account needs to be activated after payment.
            Contact us to restore full access — updates apply within about a minute after activation.
          </div>
        )}

        {data && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Current plan</p>
                  <p className="text-xl font-bold mt-1">{data.planLabel}</p>
                  <p className="text-sm text-slate-400 mt-1">{data.planDescription}</p>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    data.subscriptionStatus === "active"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : data.subscriptionStatus === "trialing"
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-slate-500/20 text-slate-300"
                  }`}
                >
                  {data.subscriptionStatus}
                </span>
              </div>

              {data.subscriptionStatus === "trialing" && trialDaysLeft != null && (
                <p className="text-xs text-slate-400 mt-4 border-t border-white/10 pt-4">
                  {trialDaysLeft < 0
                    ? "Trial period has ended."
                    : trialDaysLeft === 0
                      ? "Trial ends today."
                      : `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left in your ${ORGANIZATION_TRIAL_DAYS}-day trial.`}
                  {data.trialEndsAt && (
                    <> Ends {new Date(data.trialEndsAt).toLocaleDateString(undefined, { dateStyle: "medium" })}.</>
                  )}
                </p>
              )}

              {data.subscriptionStatus === "active" && data.paidThrough && (
                <p className="text-xs text-slate-400 mt-4 border-t border-white/10 pt-4">
                  Paid through {new Date(data.paidThrough).toLocaleDateString(undefined, { dateStyle: "medium" })}.
                </p>
              )}
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-300 mb-3">Usage</h2>
              <div className="grid gap-3 sm:grid-cols-1">
                {usageRows.map((row) => (
                  <UsageBar key={row.key} row={row} />
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-300 mb-3">Available plans</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.plans.map((p) => (
                  <div
                    key={p.id}
                    className={`rounded-xl border p-4 text-sm ${
                      p.id === data.plan
                        ? "border-blue-400/50 bg-blue-500/10"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <p className="font-semibold">{p.label}</p>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{p.description}</p>
                    <ul className="text-xs text-slate-400 mt-3 space-y-1">
                      <li>{p.maxUsers == null ? "Unlimited users" : `Up to ${p.maxUsers} users`}</li>
                      <li>{p.maxBranches == null ? "Unlimited branches" : `Up to ${p.maxBranches} branches`}</li>
                      <li>{p.maxLeads == null ? "Unlimited leads" : `Up to ${p.maxLeads.toLocaleString()} leads`}</li>
                    </ul>
                    {p.id === data.plan && (
                      <span className="inline-block mt-3 text-[10px] uppercase tracking-wider font-bold text-blue-300">
                        Current
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
              <p className="text-sm text-slate-300 leading-relaxed">
                To upgrade, extend your trial, or activate after payment, contact our team. Manual billing is enabled —
                we&apos;ll set your organization to <strong className="text-white">active</strong> once payment is confirmed.
              </p>
              <a
                href={`mailto:${data.contactEmail}?subject=${encodeURIComponent(`Plan upgrade — ${orgName}`)}`}
                className="inline-flex items-center justify-center gap-2 mt-4 px-5 py-2.5 rounded-xl bg-white text-slate-900 text-sm font-semibold hover:bg-slate-100 transition-colors"
              >
                <Mail size={16} />
                Contact billing
              </a>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center justify-center gap-2 w-full mt-8 py-3 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/5 transition-colors"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </div>
  );
}
