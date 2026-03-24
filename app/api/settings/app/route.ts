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

    const DEFAULT_REMARK_OPTIONS = [
      "Additional Documents Requested", "Additional Documents Sent",
      "Interview – GS/Cr./Visa", "Interview Cleared", "Payment Made",
      "Medical Requested/Booked", "Passport Submitted",
      "DS-160/VFS/Embassy Appointment", "Pink Slip", "NOC",
      "Defer Offer Requested", "Defer CoE Requested",
      "Refund Requested", "Offer Withdrawn", "Done",
    ];

    const DEFAULT_COURSES = [
      "Bachelor of IT",
      "Bachelor of Nursing",
      "Bachelor of Business",
      "Master of IT",
      "Bachelor of Community Services",
      "Master of Business Analyst",
      "Master of Business Administration",
    ];

    // Backfill remarkOptions for documents created before the field existed
    if (!settings.remarkOptions?.length) {
      settings.remarkOptions = DEFAULT_REMARK_OPTIONS;
      await settings.save();
    }

    // Backfill courses if missing
    if (!settings.courses?.length) {
      settings.courses = DEFAULT_COURSES;
      await settings.save();
    }

    // Build a plain JSON response so Mongoose internals don't interfere
    const json = settings.toObject ? settings.toObject() : settings;
    // Always guarantee remarkOptions is present as an array
    if (!Array.isArray(json.remarkOptions) || json.remarkOptions.length === 0) {
      json.remarkOptions = DEFAULT_REMARK_OPTIONS;
    }
    // Always guarantee courses is present as an array
    if (!Array.isArray(json.courses) || json.courses.length === 0) {
      json.courses = DEFAULT_COURSES;
    }

    return NextResponse.json(json);
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

    // Build a $set payload only from defined fields to avoid overwriting anything unintentionally
    // Using findOneAndUpdate with $set bypasses Mongoose array-mutation tracking issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const $set: Record<string, any> = {};
    const fields = [
      "companyName", "shortCode", "tagline", "faviconPath", "brandColor",
      "address", "phone", "email", "website",
      "leadStatuses", "leadSources", "leadStandings", "fdStatuses",
      "leadStageGroups", "leadStages",
      "b2bNames", "remarkOptions",
      "countries", "services", "courses",
      "enabledModules",
      "smtpHost", "smtpPort", "smtpUser", "smtpPass", "emailFromName",
      "paymentQrPath",
    ];
    for (const field of fields) {
      if (body[field] !== undefined) {
        $set[field] = body[field];
      }
    }

    await connectDB();

    const updated = await AppSettings.findOneAndUpdate(
      {},
      { $set },
      { new: true, upsert: true, runValidators: false }
    ).lean();

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/settings/app error:", err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
