"use client";

import { useRef, useEffect, useState } from "react";
import { LogIn, LogOut, Check, RefreshCw, ShieldAlert, ChevronDown, Loader2 } from "lucide-react";
import { useBranding } from "@/app/branding-context";
import { useEmployeeAttendance } from "@/components/hr/useEmployeeAttendance";

/** Compact attendance for dashboard header (all departments). */
export default function HeaderAttendance() {
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

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!ready) return null;

  const onPrimaryClick = () => {
    if (loading || busy) return;
    if (!checkedIn) void checkIn();
    else if (!checkedOut) void checkOut();
  };

  const primaryDisabled = loading || busy || checkedOut;
  const primaryLabel = checkedOut ? "Done" : checkedIn ? "Check out" : "Check in";
  const PrimaryIcon = checkedOut ? Check : checkedIn ? LogOut : LogIn;

  return (
    <div className="relative flex items-center gap-0.5" ref={panelRef}>
      <button
        type="button"
        onClick={onPrimaryClick}
        disabled={primaryDisabled}
        className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-2 sm:px-3 shadow-sm hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
        style={
          !checkedOut && !checkedIn
            ? { borderColor: `${branding.brandColor}55` }
            : checkedIn && !checkedOut
              ? { borderColor: "rgb(17 24 39 / 0.2)" }
              : undefined
        }
        title={checkedOut ? "Finished for today" : checkedIn ? "Record check-out" : "Record check-in"}
      >
        {busy ? (
          <Loader2 size={16} className="shrink-0 animate-spin text-gray-500" />
        ) : (
          <PrimaryIcon
            size={16}
            className={`shrink-0 ${checkedOut ? "text-emerald-600" : checkedIn ? "text-gray-900" : ""}`}
            style={!checkedIn && !checkedOut ? { color: branding.brandColor } : undefined}
            strokeWidth={2.25}
          />
        )}
        <span
          className={`text-xs font-bold sm:text-[13px] max-w-[5.5rem] sm:max-w-none truncate ${
            checkedOut ? "text-gray-500" : "text-gray-900"
          }`}
        >
          {primaryLabel}
        </span>
      </button>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-gray-200 bg-gray-50/90 p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
        title="Attendance details"
        aria-expanded={open}
      >
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-[min(100vw-2rem,18rem)] rounded-xl border border-gray-200 bg-white shadow-xl z-[60] p-3">
          <p className="text-[10px] text-gray-500 mb-2">
            Server date: <span className="font-semibold text-gray-700">{serverToday ?? "-"}</span>
          </p>
          {loading ? (
            <p className="text-xs text-gray-400 py-2">Loading…</p>
          ) : (
            <div className="space-y-1.5 text-xs text-gray-600 mb-3">
              {!todayRow ? (
                <p className="text-amber-700">Not checked in yet.</p>
              ) : (
                <>
                  <p>
                    <span className="font-medium text-gray-800">In:</span>{" "}
                    {todayRow.checkIn ? new Date(todayRow.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}
                  </p>
                  <p>
                    <span className="font-medium text-gray-800">Out:</span>{" "}
                    {todayRow.checkOut ? new Date(todayRow.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}
                  </p>
                  {invalid && (
                    <p className="flex items-center gap-1 text-red-600 font-medium">
                      <ShieldAlert size={12} /> IP / location
                    </p>
                  )}
                </>
              )}
            </div>
          )}
          <div className="flex flex-col gap-2 mb-2">
            <button
              type="button"
              onClick={() => void checkIn()}
              disabled={busy || loading || checkedIn}
              className="w-full inline-flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              style={{ backgroundColor: branding.brandColor }}
            >
              {busy && !checkedIn ? (
                <Loader2 size={14} className="animate-spin shrink-0" />
              ) : (
                <LogIn size={14} className="shrink-0" strokeWidth={2.25} />
              )}
              Check in
            </button>
            <button
              type="button"
              onClick={() => void checkOut()}
              disabled={busy || loading || !checkedIn || checkedOut}
              className="w-full inline-flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy && checkedIn && !checkedOut ? (
                <Loader2 size={14} className="animate-spin shrink-0 text-white" />
              ) : (
                <LogOut size={14} className="shrink-0" strokeWidth={2.25} />
              )}
              Check out
            </button>
            {checkedOut && (
              <p className="text-[10px] text-center text-emerald-700 font-medium">Day complete - see you tomorrow.</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || busy}
            className="w-full inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh status
          </button>
          {msg && <p className="text-[11px] text-red-600 mt-2">{msg}</p>}
        </div>
      )}
    </div>
  );
}
