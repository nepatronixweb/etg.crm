import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

function isSubscriptionExemptApiPath(pathname: string): boolean {
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname.startsWith("/api/cron")) return true;
  if (pathname === "/api/settings/app") return true;
  return false;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api")) {
    if (isSubscriptionExemptApiPath(pathname)) {
      return NextResponse.next();
    }

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (pathname.startsWith("/api/hr") || pathname.startsWith("/api/inventory")) {
      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (token.role !== "super_admin" && token.orgAccessAllowed === false) {
        return NextResponse.json(
          { error: "Subscription required", code: "SUBSCRIPTION_REQUIRED" },
          { status: 402 }
        );
      }
      return NextResponse.next();
    }

    if (token && token.role !== "super_admin" && token.orgAccessAllowed === false) {
      return NextResponse.json(
        { error: "Subscription required", code: "SUBSCRIPTION_REQUIRED" },
        { status: 402 }
      );
    }
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isLoggedIn = !!token;

  if (pathname === "/login" || pathname === "/trial") {
    if (isLoggedIn) return NextResponse.redirect(new URL("/dashboard", req.url));
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = token.role as string | undefined;
  const orgOk = role === "super_admin" || token.orgAccessAllowed === true;

  if (pathname === "/billing") {
    if (orgOk) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (!orgOk) {
    return NextResponse.redirect(new URL("/billing", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads).*)"],
};
