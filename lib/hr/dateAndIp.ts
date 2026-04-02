import type { NextRequest } from "next/server";

/** YYYY-MM-DD in configured timezone (default UTC). Set HR_TIMEZONE e.g. Asia/Dhaka. */
export function getTodayYmd(): string {
  const tz = process.env.HR_TIMEZONE || "UTC";
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function normalizeIp(ip: string): string {
  return ip.trim().replace(/^::ffff:/i, "");
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return normalizeIp(forwarded.split(",")[0] || "");
  const real = req.headers.get("x-real-ip");
  if (real) return normalizeIp(real);
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return normalizeIp(cf);
  return "unknown";
}

export function isOfficeIpMatch(clientIp: string): boolean {
  const office = process.env.OFFICE_IP?.trim();
  if (!office) return true;
  return normalizeIp(clientIp) === normalizeIp(office);
}
