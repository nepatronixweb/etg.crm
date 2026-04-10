"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatCounselingElapsed,
  getCounselledEvent,
  getCounselledEventFromStudentOrigin,
  type CounselledEvent,
} from "@/lib/counselledAt";

function eventTooltip(ev: CounselledEvent): string {
  const at = new Date(ev.atIso);
  if (Number.isNaN(at.getTime())) return `${ev.sourceLabel}`;
  const when = at.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  return `${ev.sourceLabel} · ${when}`;
}

/**
 * Compact live elapsed time since Counselled / Phone counselling (from statusDates).
 * For students, pass lead/enquiry fragments with statusDates (enquiry used when lead absent).
 */
export default function CounselledTimeInline({
  statusDates,
  studentOrigin,
}: {
  statusDates?: unknown;
  studentOrigin?: {
    lead?: { statusDates?: unknown } | null;
    enquiry?: { statusDates?: unknown } | null;
  };
}) {
  const event = useMemo(() => {
    if (studentOrigin) return getCounselledEventFromStudentOrigin(studentOrigin);
    return getCounselledEvent(statusDates);
  }, [statusDates, studentOrigin]);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!event) {
    return <span className="text-gray-300 tabular-nums text-xs">—</span>;
  }

  void tick;
  const at = new Date(event.atIso);
  if (Number.isNaN(at.getTime())) {
    return <span className="text-gray-300 tabular-nums text-xs">—</span>;
  }
  const elapsed = formatCounselingElapsed(Date.now() - at.getTime());

  return (
    <span
      className="inline-block font-mono text-xs font-semibold tabular-nums text-indigo-700"
      title={eventTooltip(event)}
    >
      {elapsed}
    </span>
  );
}
