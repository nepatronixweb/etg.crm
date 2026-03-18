import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import AppSettings from "@/models/AppSettings";

// GET — public (used by layout for branding)
export async function GET() {
  try {
    await connectDB();
    let settings = await AppSettings.findOne();
    if (!settings) {
      settings = await AppSettings.create({});
    }
    return NextResponse.json(settings);
  } catch (err) {
    console.error("GET /api/settings/app error:", err);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

// PUT — super_admin only
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    // Remove fields that should not be overwritten via this endpoint
    const {
      companyName, shortCode, tagline, faviconPath, brandColor,
      address, phone, email, website,
      leadStatuses, leadSources, leadStandings, fdStatuses, leadStageGroups, leadStages,
      countries, services,
      enabledModules,
      smtpHost, smtpPort, smtpUser, smtpPass, emailFromName,
      paymentQrPath,
    } = body;

    await connectDB();
    let settings = await AppSettings.findOne();
    if (!settings) settings = new AppSettings();

    if (companyName   !== undefined) settings.companyName   = companyName;
    if (shortCode     !== undefined) settings.shortCode     = shortCode;
    if (tagline       !== undefined) settings.tagline       = tagline;
    if (faviconPath   !== undefined) settings.faviconPath   = faviconPath;
    if (brandColor    !== undefined) settings.brandColor    = brandColor;
    if (address       !== undefined) settings.address       = address;
    if (phone         !== undefined) settings.phone         = phone;
    if (email         !== undefined) settings.email         = email;
    if (website       !== undefined) settings.website       = website;
    if (leadStatuses  !== undefined) settings.leadStatuses  = leadStatuses;
    if (leadSources   !== undefined) settings.leadSources   = leadSources;
    if (leadStandings !== undefined) settings.leadStandings = leadStandings;
    if (fdStatuses    !== undefined) settings.fdStatuses    = fdStatuses;
    if (leadStageGroups !== undefined) settings.leadStageGroups = leadStageGroups;
    if (leadStages    !== undefined) settings.leadStages    = leadStages;
    if (countries     !== undefined) settings.countries     = countries;
    if (services      !== undefined) settings.services      = services;
    if (enabledModules !== undefined) settings.enabledModules = enabledModules;
    if (smtpHost      !== undefined) settings.smtpHost      = smtpHost;
    if (smtpPort      !== undefined) settings.smtpPort      = smtpPort;
    if (smtpUser      !== undefined) settings.smtpUser      = smtpUser;
    if (smtpPass      !== undefined) settings.smtpPass      = smtpPass;
    if (emailFromName !== undefined) settings.emailFromName = emailFromName;
    if (paymentQrPath !== undefined) settings.paymentQrPath = paymentQrPath;

    await settings.save();
    return NextResponse.json(settings);
  } catch (err) {
    console.error("PUT /api/settings/app error:", err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
