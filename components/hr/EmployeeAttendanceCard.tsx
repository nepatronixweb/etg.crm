"use client";

import { Clock, LogIn, LogOut, MapPin, RefreshCw, ShieldAlert } from "lucide-react";
import { useBranding } from "@/app/branding-context";
import { useEmployeeAttendance } from "@/components/hr/useEmployeeAttendance";

/** Full-width card (optional; main attendance is in dashboard header). */
export default function EmployeeAttendanceCard() {
  const branding = useBranding();
  const {
    ready,
    serverToday,
    todayRow,
    loading,
    busy,
    msg,
    load,
    checkIn,
    checkOut,
    checkedIn,
    checkedOut,
    invalid,
  } = useEmployeeAttendance();

  if (!ready) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${branding.brandColor}18` }}
          >
            <Clock className="w-5 h-5" style={{ color: branding.brandColor }} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Today&apos;s attendance</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Office day: <span className="font-medium text-gray-700">{serverToday ?? "-"}</span> (server)
            </p>
            {loading ? (
              <p className="text-xs text-gray-400 mt-2">Loading…</p>
            ) : !todayRow ? (
              <p className="text-xs text-amber-700 mt-2">Not checked in yet.</p>
            ) : (
              <div className="mt-2 space-y-1 text-xs text-gray-600">
                <p>
                  <span className="font-medium text-gray-800">Check-in:</span>{" "}
                  {todayRow.checkIn ? new Date(todayRow.checkIn).toLocaleString() : "-"}
                </p>
                <p>
                  <span className="font-medium text-gray-800">Check-out:</span>{" "}
                  {todayRow.checkOut ? new Date(todayRow.checkOut).toLocaleString() : "-"}
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-800">Status:</span>
                  {invalid ? (
                    <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                      <ShieldAlert size={12} /> Invalid (IP / location)
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-medium">Present</span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || busy}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void checkIn()}
            disabled={busy || loading || checkedIn}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: branding.brandColor }}
          >
            <LogIn size={14} />
            Check in
          </button>
          <button
            type="button"
            onClick={() => void checkOut()}
            disabled={busy || loading || !checkedIn || checkedOut}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut size={14} />
            Check out
          </button>
        </div>
      </div>
      <p className="text-[10px] text-gray-400 mt-3 flex items-center gap-1">
        <MapPin size={10} /> Allow location for GPS validation when office coordinates are configured.
      </p>
      {msg && <p className="text-xs text-red-600 mt-2">{msg}</p>}
    </div>
  );
}
