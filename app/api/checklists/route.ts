import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Checklist from "@/models/Checklist";
import { auth } from "@/lib/auth";
import { organizationIdForSessionCreate } from "@/lib/tenantRecordAccess";

function checklistScopeForSession(session: NonNullable<Awaited<ReturnType<typeof auth>>>) {
  if (session.user.role === "super_admin") {
    return { organization: null };
  }
  const orgId = organizationIdForSessionCreate(session);
  if (!orgId) return { _id: { $exists: false } };
  return { organization: orgId };
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const scope = checklistScopeForSession(session);
    const { searchParams } = new URL(req.url);
    const country = searchParams.get("country");

    if (country) {
      const checklist = await Checklist.findOne({ country, ...scope });
      return NextResponse.json(checklist || { country, documents: [] });
    }

    const checklists = await Checklist.find(scope).sort({ country: 1 });
    return NextResponse.json(checklists);
  } catch {
    return NextResponse.json({ error: "Failed to fetch checklists" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const canEdit = session.user.role === "super_admin" || (session.user.permissions ?? []).includes("settings");
    if (!canEdit) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const body = await req.json();
    const orgId =
      session.user.role === "super_admin" ? null : organizationIdForSessionCreate(session);
    if (session.user.role !== "super_admin" && !orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const filter = {
      country: body.country,
      organization: orgId,
    };

    const checklist = await Checklist.findOneAndUpdate(filter, { ...body, organization: orgId }, { upsert: true, new: true });

    return NextResponse.json({ message: "Checklist saved", checklist });
  } catch {
    return NextResponse.json({ error: "Failed to save checklist" }, { status: 500 });
  }
}
