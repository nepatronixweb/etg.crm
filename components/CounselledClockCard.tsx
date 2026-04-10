"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { formatCounselingElapsed } from "@/lib/counselledAt";

export default function CounselledClockCard({
  atIso,
  sourceLabel,
}: {
  atIso: string;
  sourceLabel: string;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const at = new Date(atIso);
  if (Number.isNaN(at.getTime())) return null;
  void tick;
  const elapsed = Date.now() - at.getTime();

  const timeStr = at.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const dateStr = at.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="no-print rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 to-white px-4 py-3.5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-indigo-200 bg-white text-indigo-600">
          <Clock size={20} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600/90">
            {sourceLabel} · time on record
          </p>
          <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-gray-900">{timeStr}</p>
          <p className="text-xs text-gray-500">{dateStr}</p>
          <p className="mt-2 text-xs text-gray-600">
            <span className="font-medium text-gray-800">Elapsed:</span>{" "}
            <span className="tabular-nums font-medium text-indigo-700">{formatCounselingElapsed(elapsed)}</span>
            <span className="text-gray-400"> since this status was set</span>
          </p>
        </div>
      </div>
    </div>
  );
}
