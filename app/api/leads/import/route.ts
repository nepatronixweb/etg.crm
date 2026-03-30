import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Lead from "@/models/Lead";
import ActivityLog from "@/models/ActivityLog";
import { auth } from "@/lib/auth";

interface ImportedRow {
  name: string;
  phone?: string;
  email?: string;
  interestedCountry?: string;
  comments?: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Only telecallers and admins can import
    const allowed = ["super_admin", "telecaller", "front_desk"];
    if (!allowed.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { campaign, source, importDate, rows } = body as {
      campaign: string;
      source: string;
      importDate: string;
      rows: ImportedRow[];
    };

    if (!campaign?.trim()) return NextResponse.json({ error: "Campaign name is required" }, { status: 400 });
    if (!source?.trim())   return NextResponse.json({ error: "Source is required" }, { status: 400 });
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No leads found in the file" }, { status: 400 });
    }

    await connectDB();

    const importTs = importDate ? new Date(importDate) : new Date();
    const branch   = session.user.branch;
    const userId   = session.user.id;

    // Build lead documents
    const docs = rows
      .filter((r) => r.name?.trim())
      .map((r) => ({
        name:             r.name.trim(),
        phone:            (r.phone ?? "").trim(),
        email:            (r.email ?? "").toLowerCase().trim(),
        interestedCountry:(r.interestedCountry ?? "").trim(),
        comments:         (r.comments ?? "").trim(),
        source,
        campaign:         campaign.trim(),
        importDate:       importTs,
        status:           "Open/Unassigned",
        standing:         "warm",
        branch:           branch || undefined,
        assignedTo:       userId, // assign to importer
        assignedBy:       userId,
      }));

    if (docs.length === 0) {
      return NextResponse.json({ error: "No valid rows with a name found" }, { status: 400 });
    }

    const inserted = await Lead.insertMany(docs, { ordered: false });

    await ActivityLog.create({
      user:     userId,
      userName: session.user.name,
      userRole: session.user.role,
      action:   "CREATE",
      module:   "Leads",
      targetId: "bulk",
      targetName: `${inserted.length} leads`,
      details:  `Bulk import — Campaign: "${campaign}", Source: ${source}, ${inserted.length} leads added`,
    });

    return NextResponse.json({ imported: inserted.length, campaign }, { status: 201 });
  } catch (err) {
    console.error("Lead import error:", err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
