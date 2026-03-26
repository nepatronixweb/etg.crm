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

    // Backfill educationLevels if missing
    if (!settings.educationLevels?.length) {
      settings.educationLevels = ["Diploma", "Bachelor", "Master"];
      await settings.save();
    }

    // Use lean() for the JSON response to bypass Mongoose schema projection.
    // This ensures fields added after the model was first compiled (e.g. after a
    // hot-reload) are always included — toObject() only returns schema-known fields.
    const json = (await AppSettings.findOne({}).lean()) ?? settings.toObject();

    // Safety fallbacks in case the DB document is somehow missing a field
    if (!Array.isArray(json.remarkOptions) || json.remarkOptions.length === 0) {
      json.remarkOptions = DEFAULT_REMARK_OPTIONS;
    }
    if (!Array.isArray(json.courses) || json.courses.length === 0) {
      json.courses = DEFAULT_COURSES;
    }
    if (!Array.isArray(json.educationLevels) || json.educationLevels.length === 0) {
      json.educationLevels = ["Diploma", "Bachelor", "Master"];
    }

    return NextResponse.json(json);
  } catch (err) {
    console.error("GET /api/settings/app error:", err);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const canEdit = session.user.role === "super_admin" || (session.user.permissions ?? []).includes("settings");
    if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
      "countries", "services", "courses", "educationLevels",
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
