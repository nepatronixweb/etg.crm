"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export type TodayAttendanceRow = {
  _id: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: string;
  ip?: string;
};

export function useEmployeeAttendance() {
  const { status } = useSession();
  const [serverToday, setServerToday] = useState<string | null>(null);
  const [todayRow, setTodayRow] = useState<TodayAttendanceRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (status !== "authenticated") return;
    setLoading(true);
    setMsg(null);
    try {
      const to = new Date().toISOString().slice(0, 10);
      const from = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
      const r = await fetch(`/api/hr/my-attendance?from=${from}&to=${to}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to load");
      const st = d.serverToday as string;
      setServerToday(st);
      const list = (d.attendance || []) as TodayAttendanceRow[];
      setTodayRow(list.find((x) => x.date === st) ?? null);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not load attendance");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const getCoords = (): Promise<{ lat: number; lng: number }> =>
    new Promise((resolve, reject) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        reject(new Error("Location not available"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => reject(new Error("Location permission denied")),
        { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 }
      );
    });

  const checkIn = async () => {
    setBusy(true);
    setMsg(null);
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      try {
        const c = await getCoords();
        lat = c.lat;
        lng = c.lng;
      } catch {
        /* optional */
      }
      const r = await fetch("/api/hr/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Check-in failed");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Check-in failed");
    } finally {
      setBusy(false);
    }
  };

  const checkOut = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/hr/checkout", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Check-out failed");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Check-out failed");
    } finally {
      setBusy(false);
    }
  };

  const checkedIn = !!todayRow?.checkIn;
  const checkedOut = !!todayRow?.checkOut;
  const invalid = todayRow?.status === "invalid";

  return {
    ready: status === "authenticated",
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
  };
}
