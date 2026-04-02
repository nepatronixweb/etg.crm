import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getClientIp } from "@/lib/hr/dateAndIp";

/** Super admins only: IP as seen by this server for the current browser session (for HR "registered network IP" helper). */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ ip: getClientIp(req) });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
