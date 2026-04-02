"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Briefcase, Calendar, Loader2, Users, RefreshCw, MapPin } from "lucide-react";

function isHrAdminClient(session: ReturnType<typeof useSession>["data"]): boolean {
  if (!session?.user) return false;
  if (session.user.role === "super_admin") return true;
  return session.user.hrRole === "admin";
}

function normalizeIpDisplay(ip: string): string {
  return ip.trim().replace(/^::ffff:/i, "");
}

/** Human context for IPs shown in the attendance table. */
function ipDisplayMeta(ip: string | undefined): { value: string; tag: string | null } {
  const raw = (ip || "").trim();
  if (!raw || raw === "unknown") return { value: "—", tag: null };
  const d = normalizeIpDisplay(raw);
  const lower = d.toLowerCase();
  if (lower === "::1" || lower === "127.0.0.1" || lower === "0:0:0:0:0:0:0:1") {
    return { value: d, tag: "This machine (loopback)" };
  }
  if (
    d.startsWith("192.168.") ||
    d.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(d)
  ) {
    return { value: d, tag: "Private LAN" };
  }
  return { value: d, tag: "Client IP (as seen by server)" };
}

function CheckInLocationCell({ loc }: { loc?: { lat?: number; lng?: number } | null }) {
  if (loc == null) {
    return <span className="text-gray-400">—</span>;
  }
  const lat = typeof loc.lat === "number" ? loc.lat : 0;
  const lng = typeof loc.lng === "number" ? loc.lng : 0;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    return (
      <span
        className="text-xs text-gray-600 leading-snug block max-w-[11rem]"
        title="User did not share GPS, or location was unavailable at check-in."
      >
        Not captured
      </span>
    );
  }
  const label = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const href = `https://www.google.com/maps?q=${lat},${lng}`;
  return (
    <div className="space-y-0.5 max-w-[12rem]">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-start gap-1 text-xs font-mono text-indigo-700 hover:underline break-all"
      >
        <MapPin size={12} className="shrink-0 mt-0.5 text-indigo-500" />
        <span>{label}</span>
      </a>
      <span className="text-[10px] text-gray-500">GPS at check-in · Maps</span>
    </div>
  );
}

function IpAttendanceCell({ ip }: { ip?: string }) {
  const { value, tag } = ipDisplayMeta(ip);
  if (value === "—") {
    return <span className="text-gray-400">—</span>;
  }
  return (
    <div className="space-y-0.5 max-w-[14rem]">
      {tag && (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 block">{tag}</span>
      )}
      <span className="text-xs font-mono text-gray-900 break-all leading-snug">{value}</span>
    </div>
  );
}

type AttRow = {
  _id: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: string;
  ip?: string;
  location?: { lat?: number; lng?: number } | null;
  userId?: { name?: string; email?: string; role?: string };
};

type SalaryRow = {
  userId: string;
  name: string;
  email: string;
  monthlySalary: number;
  workingDays: number;
  workingHoursPerDay?: number;
  officeNetworkIp?: string;
  presentDays: number;
  absentDays: number;
  perDaySalary: number;
  finalSalary: number;
  month: string;
};

export default function HrAdminPanel({ embedded }: { embedded?: boolean }) {
  const { data: session, status } = useSession();
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  });
  const [tab, setTab] = useState<"salary" | "attendance" | "employees">("salary");
  const [salaries, setSalaries] = useState<SalaryRow[]>([]);
  const [attendance, setAttendance] = useState<AttRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lastAttSync, setLastAttSync] = useState<Date | null>(null);
  const [attRefreshing, setAttRefreshing] = useState(false);

  const loadSalary = useCallback(async () => {
    const r = await fetch(`/api/hr/admin/salary?month=${encodeURIComponent(month)}`);
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Failed to load salary");
    setSalaries(d.salaries || []);
  }, [month]);

  const pullAttendance = useCallback(async () => {
    const r = await fetch(`/api/hr/admin/attendance?month=${encodeURIComponent(month)}`);
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Failed to load attendance");
    setAttendance((d.attendance || []) as AttRow[]);
    setLastAttSync(new Date());
  }, [month]);

  const load = useCallback(async () => {
    if (!isHrAdminClient(session)) return;
    setLoading(true);
    setErr(null);
    try {
      if (tab === "salary") await loadSalary();
      else if (tab === "attendance") await pullAttendance();
      else await loadSalary();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [session, tab, loadSalary, pullAttendance]);

  useEffect(() => {
    if (status === "authenticated" && isHrAdminClient(session)) void load();
  }, [status, session, load, tab, month]);

  /** Near real-time updates while Attendance tab is open (check-ins appear without full reload). */
  useEffect(() => {
    if (tab !== "attendance" || status !== "authenticated" || !isHrAdminClient(session)) return;
    const id = setInterval(() => {
      void pullAttendance().catch(() => {});
    }, 45_000);
    return () => clearInterval(id);
  }, [tab, status, session, pullAttendance]);

  if (status !== "authenticated" || !isHrAdminClient(session)) return null;

  return (
    <div
      className={
        embedded
          ? "space-y-4"
          : "rounded-2xl border border-gray-200 bg-gradient-to-br from-indigo-50/50 via-white to-white p-5 sm:p-6 shadow-sm ring-1 ring-black/[0.04]"
      }
    >
      {embedded ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
            <Calendar size={14} className="text-gray-500" />
            Month
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500"
            />
          </label>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
              <Briefcase size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 tracking-tight">HR management</h2>
              <p className="text-sm text-gray-600 mt-0.5">Attendance overview and salary report (monthly)</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
              <Calendar size={14} className="text-gray-500" />
              Month
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500"
              />
            </label>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-5">
        {(
          [
            ["salary", "Salary report"],
            ["attendance", "Attendance"],
            ["employees", "Employees & salary"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === key
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
                : "bg-gray-100 text-gray-700 border border-transparent hover:bg-gray-200 hover:border-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          Loading…
        </div>
      ) : tab === "salary" ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm ring-1 ring-black/[0.04]">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200 text-[11px] font-bold uppercase tracking-wide text-gray-700">
                <th className="px-4 py-3.5 text-left min-w-[9rem]">Employee</th>
                <th className="px-4 py-3.5 text-right tabular-nums">Work days</th>
                <th className="px-4 py-3.5 text-right tabular-nums">Hrs/day</th>
                <th className="px-4 py-3.5 text-left min-w-[7rem]">Reg. IP</th>
                <th className="px-4 py-3.5 text-right tabular-nums">Present</th>
                <th className="px-4 py-3.5 text-right tabular-nums">Absent</th>
                <th className="px-4 py-3.5 text-right tabular-nums">Monthly</th>
                <th className="px-4 py-3.5 text-right tabular-nums">Per day</th>
                <th className="px-4 py-3.5 text-right tabular-nums">Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {salaries.map((row) => (
                <tr key={row.userId} className="hover:bg-slate-50/90 transition-colors">
                  <td className="px-4 py-3.5 align-top">
                    <p className="font-semibold text-gray-900">{row.name}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{row.email}</p>
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-gray-900 font-medium">{row.workingDays}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-gray-900 font-medium">
                    {row.workingHoursPerDay ?? 8}
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    {row.officeNetworkIp ? (
                      <code className="text-[11px] font-mono text-gray-900 break-all leading-snug">{row.officeNetworkIp}</code>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-gray-900 font-medium">{row.presentDays}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-gray-900 font-medium">{row.absentDays}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-gray-900 font-medium">
                    {row.monthlySalary.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-gray-900 font-medium">
                    {row.perDaySalary.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-indigo-700">
                    {row.finalSalary.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {salaries.length === 0 && (
            <p className="px-4 py-10 text-center text-sm font-medium text-gray-600 border-t border-gray-100">No employees found.</p>
          )}
        </div>
      ) : tab === "attendance" ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
            <p className="text-xs text-gray-600">
              <span className="font-semibold text-gray-800">Live updates:</span> list refreshes every{" "}
              <span className="font-mono font-semibold">45s</span> while this tab is open.
              {lastAttSync && (
                <span className="text-gray-500">
                  {" "}
                  · Last sync {lastAttSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={() => {
                setAttRefreshing(true);
                setErr(null);
                void pullAttendance()
                  .catch((e) => setErr(e instanceof Error ? e.message : "Refresh failed"))
                  .finally(() => setAttRefreshing(false));
              }}
              disabled={attRefreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw size={14} className={attRefreshing ? "animate-spin" : ""} />
              Refresh now
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white max-h-[420px] overflow-y-auto shadow-sm ring-1 ring-black/[0.04]">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-100">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-gray-700">
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Employee</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Check-in</th>
                  <th className="px-4 py-3.5">Check-out</th>
                  <th className="px-4 py-3.5 min-w-[10rem]">Check-in location</th>
                  <th className="px-4 py-3.5 min-w-[9rem]">Network IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attendance.map((row) => {
                  const u = row.userId;
                  const name = typeof u === "object" && u?.name ? u.name : "—";
                  return (
                    <tr key={row._id} className="hover:bg-slate-50/90 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap text-gray-900 font-medium tabular-nums">{row.date}</td>
                      <td className="px-4 py-3.5 text-gray-900 font-medium">{name}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            row.status === "present" ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-900 whitespace-nowrap font-medium">
                        {row.checkIn ? new Date(row.checkIn).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-900 whitespace-nowrap font-medium">
                        {row.checkOut ? new Date(row.checkOut).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <CheckInLocationCell loc={row.location} />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <IpAttendanceCell ip={row.ip} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {attendance.length === 0 && (
              <p className="px-4 py-10 text-center text-sm font-medium text-gray-600 border-t border-gray-100">
                No rows this month.
              </p>
            )}
          </div>
        </div>
      ) : (
        <EmployeesSalaryTable month={month} />
      )}
    </div>
  );
}

function EmployeesSalaryTable({ month }: { month: string }) {
  const [rows, setRows] = useState<SalaryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/hr/admin/salary?month=${encodeURIComponent(month)}`);
        const d = await r.json();
        if (!cancelled && r.ok) setRows(d.salaries || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [month]);

  if (loading) {
    return (
      <div className="flex justify-center py-12 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm ring-1 ring-black/[0.04]">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-200 text-[11px] font-bold uppercase tracking-wide text-gray-700">
            <th className="px-4 py-3.5 text-left">
              <span className="inline-flex items-center gap-1.5">
                <Users size={14} className="text-gray-500" aria-hidden />
                Employee
              </span>
            </th>
            <th className="px-4 py-3.5 text-left">Email</th>
            <th className="px-4 py-3.5 text-right tabular-nums">Monthly salary</th>
            <th className="px-4 py-3.5 text-right tabular-nums">Working days</th>
            <th className="px-4 py-3.5 text-right tabular-nums">Hrs/day</th>
            <th className="px-4 py-3.5 text-left min-w-[7rem]">Reg. IP</th>
            <th className="px-4 py-3.5 text-right tabular-nums">Present (month)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.userId} className="hover:bg-slate-50/90 transition-colors">
              <td className="px-4 py-3.5 font-semibold text-gray-900">{row.name}</td>
              <td className="px-4 py-3.5 text-gray-800">{row.email}</td>
              <td className="px-4 py-3.5 text-right tabular-nums text-gray-900 font-medium">
                {row.monthlySalary.toLocaleString()}
              </td>
              <td className="px-4 py-3.5 text-right tabular-nums text-gray-900 font-medium">{row.workingDays}</td>
              <td className="px-4 py-3.5 text-right tabular-nums text-gray-900 font-medium">
                {row.workingHoursPerDay ?? 8}
              </td>
              <td className="px-4 py-3.5 align-top">
                {row.officeNetworkIp ? (
                  <code className="text-[11px] font-mono text-gray-900 break-all">{row.officeNetworkIp}</code>
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </td>
              <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-gray-900">{row.presentDays}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="px-4 py-10 text-center text-sm font-medium text-gray-600 border-t border-gray-100">No employees found.</p>
      )}
    </div>
  );
}
