import type { NextRequest } from "next/server";
import { getClientIp, isOfficeIpMatch } from "@/lib/hr/dateAndIp";
import { isWithinOfficeRadius } from "@/lib/hr/haversine";

export type HrAttendanceStatus = "present" | "invalid";

export function resolveCheckInStatus(
  req: NextRequest,
  lat: number | undefined,
  lng: number | undefined
): HrAttendanceStatus {
  const ip = getClientIp(req);
  if (!isOfficeIpMatch(ip)) return "invalid";
  if (typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng)) {
    if (!isWithinOfficeRadius(lat, lng)) return "invalid";
  }
  return "present";
}
