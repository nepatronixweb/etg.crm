"use client";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Users, UserCheck, FileText, TrendingUp,
  ChevronRight, Activity, Target, ArrowUp,
  FolderOpen, LayoutDashboard, Bell,
  Clock, CheckCircle2, PlaneTakeoff, Award, XCircle, BadgeCheck, FilePlus2,
  SlidersHorizontal, Check,
} from "lucide-react";
import { formatDateTime, getStatusColor } from "@/lib/utils";
import Link from "next/link";

interface AnalyticsData {
  summary: {
    totalLeads: number;
    totalStudents: number;
    totalApplications: number;
    convertedLeads: number;
    conversionRate: number;
    gsApplied: number;
    coeReceived: number;
    conditionalOffers: number;
    unconditionalOffers: number;
    visaLodged: number;
    granted: number;
    rejected: number;
  };
  recentLeads: Array<{
    _id: string;
    name: string;
    source: string;
    status: string;
    interestedCountry: string;
    createdAt: string;
    branch: { name: string };
  }>;
  recentActivity: Array<{
    _id: string;
    userName: string;
    action: string;
    module: string;
    targetName: string;
    createdAt: string;
  }>;
  counsellorPerformance: Array<{
    _id: string;
    name: string;
    target: number;
    currentCount: number;
    branch: { name: string };
  }>;
  leadsByStatus: Array<{ _id: string; count: number }>;
}

interface INotif {
  _id: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

interface IAssignedLead {
  _id: string;
  name: string;
  phone: string;
  interestedCountry: string;
  status: string;
  source: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  heated: "Heated",
  hot: "Hot",
  warm: "Warm",
  out_of_contact: "Out of Contact",
};

type FilterPeriod = "all" | "daily" | "weekly" | "3month" | "6month" | "9month" | "year";

const FILTER_OPTIONS: { value: FilterPeriod; label: string }[] = [
  { value: "all",    label: "All Time" },
  { value: "daily",  label: "Today" },
  { value: "weekly", label: "This Week" },
  { value: "3month", label: "Last 3 Months" },
  { value: "6month", label: "Last 6 Months" },
  { value: "9month", label: "Last 9 Months" },
  { value: "year",   label: "This Year" },
];

function getDateRange(period: FilterPeriod): { from?: string; to?: string } {
  const now = new Date();
  const to = now.toISOString();
  if (period === "all") return {};
  if (period === "daily") {
    const from = new Date(now); from.setHours(0, 0, 0, 0);
    return { from: from.toISOString(), to };
  }
  if (period === "weekly") {
    const from = new Date(now); from.setDate(from.getDate() - 7);
    return { from: from.toISOString(), to };
  }
  if (period === "3month") {
    const from = new Date(now); from.setMonth(from.getMonth() - 3);
    return { from: from.toISOString(), to };
  }
  if (period === "6month") {
    const from = new Date(now); from.setMonth(from.getMonth() - 6);
    return { from: from.toISOString(), to };
  }
  if (period === "9month") {
    const from = new Date(now); from.setMonth(from.getMonth() - 9);
    return { from: from.toISOString(), to };
  }
  if (period === "year") {
    const from = new Date(now.getFullYear(), 0, 1);
    return { from: from.toISOString(), to };
  }
  return {};
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const isAdmin = session?.user?.role === "super_admin";
  const isCounsellor = session?.user?.role === "counsellor";

  // Counsellor: assigned leads
  const [assignedLeads, setAssignedLeads] = useState<IAssignedLead[]>([]);

  // Admin + Counsellor: recent notifications on dashboard
  const [notifs, setNotifs] = useState<INotif[]>([]);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      const { from, to } = getDateRange(filterPeriod);
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const url = `/api/analytics${params.toString() ? `?${params}` : ""}`;
      if (data) setRefetching(true); else setLoading(true);
      fetch(url)
        .then((r) => r.json())
        .then((d) => { setData(d); setLoading(false); setRefetching(false); })
        .catch(() => { setLoading(false); setRefetching(false); });
      // Also fetch recent notifications for admin
      fetch("/api/notifications?limit=5")
        .then((r) => r.json())
        .then((d) => setNotifs(d.notifications ?? []))
        .catch(() => {});
    } else if (isCounsellor) {
      // Fetch my assigned leads
      fetch("/api/leads")
        .then((r) => r.json())
        .then((d) => setAssignedLeads(Array.isArray(d) ? d.slice(0, 8) : []))
        .catch(() => {});
      // Fetch my notifications
      fetch("/api/notifications?limit=5")
        .then((r) => r.json())
        .then((d) => setNotifs(d.notifications ?? []))
        .catch(() => {});
      setLoading(false);
    } else {
      setTimeout(() => setLoading(false), 0);
    }
  }, [isAdmin, isCounsellor, filterPeriod]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {isAdmin ? "Overview" : "Dashboard"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Welcome back, {session?.user?.name} &mdash; Education Tree Global
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            {/* Refetch spinner */}
            {refetching && (
              <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            )}
            {/* Filter dropdown */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setFilterOpen((o) => !o)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  filterPeriod !== "all"
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                }`}
              >
                <SlidersHorizontal size={13} />
                {FILTER_OPTIONS.find((o) => o.value === filterPeriod)?.label ?? "Filter"}
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  {FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setFilterPeriod(opt.value); setFilterOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                        filterPeriod === opt.value
                          ? "bg-gray-900 text-white"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {opt.label}
                      {filterPeriod === opt.value && <Check size={13} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 border border-gray-200">
              Super Admin
            </span>
          </div>
        )}
      </div>

      {isAdmin && data && (
        <div className={`space-y-6 transition-opacity duration-200 ${refetching ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
          {/* KPI Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Total Leads",
                value: data.summary.totalLeads,
                sub: `${data.summary.convertedLeads} converted`,
                icon: Users,
                href: "/leads",
              },
              {
                label: "Total Students",
                value: data.summary.totalStudents,
                sub: "Active enrolments",
                icon: UserCheck,
                href: "/students",
              },
              {
                label: "Applications",
                value: data.summary.totalApplications,
                sub: "All time",
                icon: FileText,
                href: "/applications",
              },
              {
                label: "Conversion Rate",
                value: `${data.summary.conversionRate}%`,
                sub: "Lead to student",
                icon: TrendingUp,
                href: "/reports",
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.label}
                  href={card.href}
                  className="group bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2 bg-gray-50 border border-gray-100 rounded-md">
                      <Icon size={16} className="text-gray-600" />
                    </div>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors mt-1" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 tracking-tight">{card.value}</p>
                  <p className="text-xs font-medium text-gray-700 mt-1">{card.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
                </Link>
              );
            })}
          </div>

          {/* Student Pipeline Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              {
                label: "GS Applied",
                value: data.summary.gsApplied,
                sub: "Application stage",
                icon: FilePlus2,
                color: "text-sky-600",
                bg: "bg-sky-50 border-sky-100",
              },
              {
                label: "COE Received",
                value: data.summary.coeReceived,
                sub: "Enrollment confirmed",
                icon: BadgeCheck,
                color: "text-teal-600",
                bg: "bg-teal-50 border-teal-100",
              },
              {
                label: "Conditional",
                value: data.summary.conditionalOffers,
                sub: "Conditional offer",
                icon: Clock,
                color: "text-amber-600",
                bg: "bg-amber-50 border-amber-100",
              },
              {
                label: "Unconditional",
                value: data.summary.unconditionalOffers,
                sub: "Unconditional offer",
                icon: CheckCircle2,
                color: "text-green-600",
                bg: "bg-green-50 border-green-100",
              },
              {
                label: "Visa Lodged",
                value: data.summary.visaLodged,
                sub: "Visa submitted",
                icon: PlaneTakeoff,
                color: "text-indigo-600",
                bg: "bg-indigo-50 border-indigo-100",
              },
              {
                label: "Granted",
                value: data.summary.granted,
                sub: "Visa approved",
                icon: Award,
                color: "text-emerald-600",
                bg: "bg-emerald-50 border-emerald-100",
              },
              {
                label: "Rejected",
                value: data.summary.rejected,
                sub: "Visa rejected",
                icon: XCircle,
                color: "text-red-500",
                bg: "bg-red-50 border-red-100",
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-2"
                >
                  <div className={`w-8 h-8 rounded-md border flex items-center justify-center ${card.bg}`}>
                    <Icon size={15} className={card.color} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 tracking-tight">{card.value}</p>
                  <div>
                    <p className="text-xs font-semibold text-gray-700">{card.label}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{card.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Middle Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Recent Leads */}
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Users size={15} className="text-gray-500" />
                  <h2 className="text-sm font-semibold text-gray-800">Recent Leads</h2>
                </div>
                <Link
                  href="/leads"
                  className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 transition-colors"
                >
                  View all <ChevronRight size={12} />
                </Link>
              </div>

              {data.recentLeads.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-gray-400">No leads recorded yet</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {data.recentLeads.map((lead) => (
                    <Link
                      key={lead._id}
                      href={`/leads/${lead._id}`}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-gray-600">
                            {lead.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{lead.name}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {lead.interestedCountry}
                            {lead.branch?.name ? ` · ${lead.branch.name}` : ""}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${getStatusColor(lead.status)}`}
                      >
                        {STATUS_LABELS[lead.status] ?? lead.status}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Counsellor Targets */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                <Target size={15} className="text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-800">Counsellor Targets</h2>
              </div>

              {data.counsellorPerformance.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-gray-400">No counsellors found</div>
              ) : (
                <div className="px-5 py-4 space-y-5">
                  {data.counsellorPerformance.map((c) => {
                    const pct = c.target > 0
                      ? Math.min(100, Math.round((c.currentCount / c.target) * 100))
                      : 0;
                    const isComplete = pct >= 100;
                    return (
                      <div key={c._id}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                            {c.branch?.name && (
                              <p className="text-xs text-gray-400 truncate">{c.branch.name}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <span className="text-sm font-semibold text-gray-900">{c.currentCount}</span>
                            <span className="text-xs text-gray-400">/{c.target}</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              isComplete ? "bg-gray-800" : "bg-gray-400"
                            }`}
                            style={{ inlineSize: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{pct}% of target</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Lead Status Breakdown */}
          {data.leadsByStatus.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                <ArrowUp size={15} className="text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-800">Lead Status Breakdown</h2>
              </div>
              <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {data.leadsByStatus.map((s) => (
                  <div key={s._id} className="text-center p-3 rounded-md bg-gray-50 border border-gray-100">
                    <p className="text-xl font-bold text-gray-900">{s.count}</p>
                    <p className="text-xs text-gray-500 mt-0.5 capitalize">
                      {STATUS_LABELS[s._id] ?? s._id}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity + Notifications — side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Recent Activity */}
            <div className="bg-white border border-gray-200 rounded-lg flex flex-col">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                <Activity size={15} className="text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-800">Recent Activity</h2>
              </div>
              {data.recentActivity.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-gray-400 flex-1">No activity logged</div>
              ) : (
                <div className="divide-y divide-gray-50 flex-1">
                  {data.recentActivity.map((log) => (
                    <div
                      key={log._id}
                      className="flex items-center justify-between px-5 py-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                        <p className="text-sm text-gray-700 truncate">
                          <span className="font-medium text-gray-900">{log.userName}</span>
                          {" "}
                          <span className="text-gray-500 capitalize">{log.action.toLowerCase()}</span>
                          {" "}
                          <span className="text-gray-800">{log.targetName}</span>
                          <span className="text-gray-400"> &mdash; {log.module}</span>
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap ml-4 shrink-0">
                        {formatDateTime(log.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications (admin only) */}
            <div className="bg-white border border-gray-200 rounded-lg flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Bell size={15} className="text-gray-500" />
                  <h2 className="text-sm font-semibold text-gray-800">Notifications</h2>
                  {notifs.filter((n) => !n.read).length > 0 && (
                    <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                      {notifs.filter((n) => !n.read).length} new
                    </span>
                  )}
                </div>
              </div>
              {notifs.length === 0 ? (
                <div className="px-5 py-10 text-center flex-1">
                  <Bell size={24} className="text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 flex-1">
                  {notifs.map((n) => (
                    <div key={n._id} className={`px-5 py-3.5 flex items-start gap-3 ${n.read ? "" : "bg-blue-50"}`}>
                      <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.read ? "bg-gray-200" : "bg-blue-500"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-800">{n.title}</p>
                          <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">{formatDateTime(n.createdAt)}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                        {n.link && (
                          <Link href={n.link} className="text-xs text-blue-600 hover:underline mt-0.5 inline-block">
                            View lead →
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Non-admin quick links */}
      {!isAdmin && (
        <>
          {/* Counsellor: Notifications Banner */}
          {isCounsellor && notifs.filter((n) => !n.read).length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-4 flex items-start gap-3">
              <Bell size={16} className="text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-800">
                  You have {notifs.filter((n) => !n.read).length} new notification{notifs.filter((n) => !n.read).length > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-blue-600 mt-0.5">Check the bell icon in the top-right to view them.</p>
              </div>
            </div>
          )}

          {/* Counsellor: My Assigned Leads */}
          {isCounsellor && (
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Users size={15} className="text-gray-500" />
                  <h2 className="text-sm font-semibold text-gray-800">My Assigned Leads</h2>
                </div>
                <Link
                  href="/leads"
                  className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 transition-colors"
                >
                  View all <ChevronRight size={12} />
                </Link>
              </div>

              {assignedLeads.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <Users size={28} className="text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No leads assigned yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {assignedLeads.map((lead) => (
                    <Link
                      key={lead._id}
                      href={`/leads/${lead._id}`}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-gray-600">
                            {lead.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{lead.name}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {lead.phone}
                            {lead.interestedCountry ? ` · ${lead.interestedCountry}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${getStatusColor(lead.status)}`}>
                          {lead.status?.replace("_", " ")}
                        </span>
                        <ChevronRight size={13} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Counsellor: Recent Notifications */}
          {isCounsellor && notifs.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                <Bell size={15} className="text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-800">Recent Notifications</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {notifs.map((n) => (
                  <div key={n._id} className={`px-5 py-3.5 flex items-start gap-3 ${n.read ? "" : "bg-blue-50"}`}>
                    <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.read ? "bg-gray-200" : "bg-blue-500"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-800">{n.title}</p>
                        <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">{formatDateTime(n.createdAt)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                      {n.link && (
                        <Link href={n.link} className="text-xs text-blue-600 hover:underline mt-0.5 inline-block">
                          View lead →
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generic quick links for non-counsellor, non-admin roles */}
          {!isCounsellor && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Leads", href: "/leads", icon: Users, desc: "View and manage your assigned leads" },
                { label: "Students", href: "/students", icon: UserCheck, desc: "Track your student progress" },
                { label: "Documents", href: "/documents", icon: FolderOpen, desc: "Manage student documents" },
                { label: "Applications", href: "/applications", icon: FileText, desc: "Track application statuses" },
                { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, desc: "Return to this overview" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 hover:shadow-sm transition-all"
                  >
                    <div className="p-2 bg-gray-50 border border-gray-100 rounded-md inline-flex mb-4">
                      <Icon size={16} className="text-gray-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">{item.label}</h3>
                    <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
