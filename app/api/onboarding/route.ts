import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Organization from "@/models/Organization";
import AppSettings from "@/models/AppSettings";
import { auth } from "@/lib/auth";
import { getAppSettingsDocumentForSession } from "@/lib/appSettingsScope";
import { isOrgWideAdmin } from "@/lib/roleGuards";
import { ORGANIZATION_TRIAL_DAYS } from "@/lib/organizationAccess";

export const dynamic = "force-dynamic";

const DEFAULT_LEAD_SOURCES = ["Walk-in", "Website", "Referral", "WhatsApp", "Facebook", "Other"];
const SUGGESTED_COUNTRIES = ["Australia", "United Kingdom", "Canada", "New Zealand", "United States"];

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isOrgWideAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const orgId = session.user.organizationId;
    let completed = Boolean(session.user.orgOnboardingCompleted);
    if (orgId && mongoose.Types.ObjectId.isValid(orgId)) {
      const org = await Organization.findById(orgId).select("onboardingCompletedAt subscriptionStatus trialEndsAt name").lean();
      completed = Boolean(org?.onboardingCompletedAt);
    }

    const settings = await getAppSettingsDocumentForSession(session);
    const lean = settings.toObject();

    return NextResponse.json({
      completed,
      suggestedCountries: SUGGESTED_COUNTRIES,
      suggestedLeadSources: DEFAULT_LEAD_SOURCES,
      trialDays: ORGANIZATION_TRIAL_DAYS,
      organizationName: session.user.organizationName,
      settings: {
        companyName: lean.companyName ?? "",
        shortCode: lean.shortCode ?? "",
        tagline: lean.tagline ?? "",
        brandColor: lean.brandColor ?? "#2563eb",
        brandSecondaryColor: lean.brandSecondaryColor ?? "",
        countries: Array.isArray(lean.countries) ? lean.countries : [],
        leadSources: Array.isArray(lean.leadSources) ? lean.leadSources : [],
      },
    });
  } catch (err) {
    console.error("GET /api/onboarding", err);
    return NextResponse.json({ error: "Failed to load onboarding" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isOrgWideAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orgId = session.user.organizationId;
    if (!orgId || !mongoose.Types.ObjectId.isValid(orgId)) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const body = await req.json();
    const skip = body.skip === true;
    const complete = body.complete === true || skip;

    await connectDB();
    const settings = await getAppSettingsDocumentForSession(session);

    if (!skip) {
      const $set: Record<string, unknown> = {};
      if (typeof body.companyName === "string" && body.companyName.trim()) {
        $set.companyName = body.companyName.trim();
      }
      if (typeof body.shortCode === "string" && body.shortCode.trim()) {
        $set.shortCode = body.shortCode.trim().toUpperCase().slice(0, 5);
      }
      if (typeof body.tagline === "string") $set.tagline = body.tagline.trim();
      if (typeof body.brandColor === "string" && body.brandColor.trim()) {
        $set.brandColor = body.brandColor.trim();
      }
      if (typeof body.brandSecondaryColor === "string" && body.brandSecondaryColor.trim()) {
        $set.brandSecondaryColor = body.brandSecondaryColor.trim();
      }
      if (Array.isArray(body.countries)) {
        $set.countries = body.countries
          .filter((c: unknown) => typeof c === "string" && c.trim())
          .map((c: string) => ({ name: c.trim(), universities: [] }));
      }
      if (Array.isArray(body.leadSources)) {
        $set.leadSources = body.leadSources
          .map((s: unknown) => String(s ?? "").trim())
          .filter(Boolean);
      }

      if (Object.keys($set).length > 0) {
        await AppSettings.findByIdAndUpdate(settings._id, { $set }, { runValidators: false });
      }
    }

    if (complete) {
      await Organization.findByIdAndUpdate(orgId, {
        $set: { onboardingCompletedAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true, completed: complete });
  } catch (err) {
    console.error("POST /api/onboarding", err);
    return NextResponse.json({ error: "Failed to save onboarding" }, { status: 500 });
  }
}
