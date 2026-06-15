import { NextResponse } from "next/server";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
} as const;

export function jsonNoCache(data: unknown, init?: ResponseInit): NextResponse {
  const headers = new Headers(init?.headers);
  for (const [key, value] of Object.entries(NO_CACHE_HEADERS)) {
    headers.set(key, value);
  }
  return NextResponse.json(data, { ...init, headers });
}
