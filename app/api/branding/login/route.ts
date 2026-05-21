import { NextRequest, NextResponse } from "next/server";
import { resolveLoginBrandingForEmail } from "@/lib/loginBranding";

export const dynamic = "force-dynamic";

/** Public: login page branding from email (returns platform defaults when unknown). */
export async function GET(req: NextRequest) {
  try {
    const email = new URL(req.url).searchParams.get("email");
    const branding = await resolveLoginBrandingForEmail(email);
    return NextResponse.json(branding);
  } catch (err) {
    console.error("GET /api/branding/login", err);
    return NextResponse.json(
      {
        companyName: "Education Tree Global",
        shortCode: "ETG",
        tagline: "CRM Portal",
        logoPath: "",
        brandColor: "#2563eb",
        brandSecondaryColor: "#1d4ed8",
      },
      { status: 200 }
    );
  }
}
