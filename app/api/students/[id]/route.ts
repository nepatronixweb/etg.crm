import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Student from "@/models/Student";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";
import AppSettings from "@/models/AppSettings";
import { auth } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();
    const student = await Student.findById(id)
      .populate("branch", "name location")
      .populate("counsellor", "name email")
      .lean();
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    return NextResponse.json(student);
  } catch {
    return NextResponse.json({ error: "Failed to fetch student" }, { status: 500 });
  }
}

// Fields that are mirrored bidirectionally between the top-level student doc
// and every admissionDetails entry so all three views stay in sync.
const QUICK_SYNC_FIELDS = new Set(["stage", "remarks", "standing", "currentStage"]);

const ADMISSION_TRACKED_FIELDS = ["stage", "pipeline", "standing", "remarks", "statusDate"] as const;
const MAX_ADMISSION_TRACKING_ENTRIES = 150;

function normAdmissionStatusDate(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s.includes("T") ? s.split("T")[0]! : s.slice(0, 10);
}

/** Stable string for admission subdocument _id (ObjectId, Extended JSON, or hex string). */
function admissionSubdocIdString(v: unknown): string {
  if (v == null || v === "") return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null) {
    const o = v as { $oid?: string; toHexString?: () => string };
    if (typeof o.$oid === "string") return o.$oid;
    if (typeof o.toHexString === "function") return o.toHexString();
  }
  const s = String(v);
  return s === "[object Object]" ? "" : s;
}

function mergeAdmissionDetailTrackingHistory(
  oldDetails: unknown[],
  pipelineMappedDetails: Record<string, unknown>[],
  sessionUser: { id?: string; email?: string; name?: string | null },
): Record<string, unknown>[] {
  const oldList = Array.isArray(oldDetails) ? oldDetails : [];
  const oldById = new Map<string, Record<string, unknown>>();
  for (const d of oldList) {
    const doc = d as Record<string, unknown>;
    const sid = admissionSubdocIdString(doc?._id);
    if (sid) oldById.set(sid, doc);
  }
  const changedBy = String(sessionUser.id || sessionUser.email || "");
  const changedByName = String(sessionUser.name || sessionUser.email || "");

  return pipelineMappedDetails.map((detail, idx) => {
    const d = detail as Record<string, unknown>;
    const { trackingHistory: _ignored, ...rest } = d;
    const idKey = admissionSubdocIdString(rest._id);
    let prev = idKey ? oldById.get(idKey) : undefined;
    if (!prev && idx < oldList.length) {
      const atIdx = oldList[idx] as Record<string, unknown>;
      const atIdxId = admissionSubdocIdString(atIdx?._id);
      if (!idKey) {
        prev = atIdx;
      } else if (atIdxId === idKey) {
        prev = atIdx;
      } else if (!oldById.has(idKey) && oldList.length === pipelineMappedDetails.length) {
        // Client sent an _id not present in DB (or format mismatch): keep position when counts match
        prev = atIdx;
      }
    }
    if (!prev) {
      return { ...rest, trackingHistory: [] };
    }
    const prevHistory = Array.isArray(prev.trackingHistory)
      ? [...(prev.trackingHistory as unknown[])]
      : [];
    const change: Record<string, unknown> = {
      at: new Date(),
      changedBy,
      changedByName,
    };
    let anyChange = false;
    for (const field of ADMISSION_TRACKED_FIELDS) {
      const fromVal =
        field === "statusDate"
          ? normAdmissionStatusDate(prev[field])
          : String(prev[field] ?? "");
      const toVal =
        field === "statusDate"
          ? normAdmissionStatusDate(rest[field])
          : String(rest[field] ?? "");
      if (fromVal !== toVal) {
        change[field] = { from: fromVal, to: toVal };
        anyChange = true;
      }
    }
    if (!anyChange) {
      return { ...rest, trackingHistory: prevHistory };
    }
    const nextHistory = [...prevHistory, change].slice(-MAX_ADMISSION_TRACKING_ENTRIES);
    return { ...rest, trackingHistory: nextHistory };
  });
}

function countryHasVisaApproved(countries: unknown, countryName: string): boolean {
  if (!countryName || !Array.isArray(countries)) return false;
  return countries.some((c: unknown) => {
    const doc = c as { country?: string; visaApprovedAt?: unknown };
    return doc.country === countryName && doc.visaApprovedAt != null && doc.visaApprovedAt !== "";
  });
}

/** After visa approval, stage / pipeline / standing / remarks cannot change for that country. */
function freezeVisaLockedAdmissionFields(
  existingStudent: { countries?: unknown; admissionDetails?: unknown },
  details: Record<string, unknown>[],
): Record<string, unknown>[] {
  const oldList = Array.isArray(existingStudent.admissionDetails)
    ? (existingStudent.admissionDetails as Record<string, unknown>[])
    : [];
  return details.map((d, idx) => {
    const country = String(d.country ?? "");
    if (!countryHasVisaApproved(existingStudent.countries, country)) return d;
    const idKey = admissionSubdocIdString(d._id);
    let prev = idKey ? oldList.find((o) => admissionSubdocIdString(o._id) === idKey) : undefined;
    if (!prev && idx < oldList.length) prev = oldList[idx];
    if (!prev) return d;
    return {
      ...d,
      stage: prev.stage,
      pipeline: prev.pipeline,
      standing: prev.standing,
      remarks: prev.remarks,
    };
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();
    const body = await req.json();

    const existingStudent = await Student.findById(id).lean();
    if (!existingStudent) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    
    // Fetch AppSettings to get the stage-to-pipeline mapping
    const appSettings = await AppSettings.findOne().lean();
    const stageToPipelineMapping = appSettings?.stageToPipelineMapping || {};
    
    // Support raw MongoDB operators ($push, $pull, etc.) passed directly in the body
    const hasOperators = Object.keys(body).some((k) => k.startsWith("$"));

    let update: Record<string, unknown>;

    if (hasOperators) {
      update = body;
    } else {
      const setFields: Record<string, unknown> = { ...body };

      // Direction A: admissionDetails inline edit → AUTO-MAP PIPELINE
      if (Array.isArray(body.admissionDetails) && body.admissionDetails.length > 0) {
        const pipelineMapped = body.admissionDetails.map((detail: Record<string, unknown>) => {
          const stage = detail.stage;
          if (stage && typeof stage === "string") {
            const mappedPipeline = stageToPipelineMapping[stage];
            if (mappedPipeline) {
              return { ...detail, pipeline: mappedPipeline };
            }
          }
          return detail;
        });

        const frozenDetails = freezeVisaLockedAdmissionFields(existingStudent, pipelineMapped);

        const updatedAdmissionDetails = mergeAdmissionDetailTrackingHistory(
          Array.isArray(existingStudent.admissionDetails) ? existingStudent.admissionDetails : [],
          frozenDetails,
          session.user,
        );

        // Replace the entire admissionDetails array with updated one
        setFields.admissionDetails = updatedAdmissionDetails;

        // Use the last non-closed entry as the primary source of truth
        const primary =
          [...updatedAdmissionDetails].reverse().find((e: { closed?: boolean }) => !e.closed) ??
          updatedAdmissionDetails[updatedAdmissionDetails.length - 1];
        if (primary) {
          if (primary.stage !== undefined) {
            setFields.stage = primary.stage;
          }
          // Always sync remarks & standing (including empty strings to support clearing)
          if (primary.remarks !== undefined) {
            setFields.remarks = primary.remarks;
          }
          if (primary.standing !== undefined) {
            setFields.standing = primary.standing;
          }
          if (primary.pipeline !== undefined && primary.pipeline !== "") {
            setFields.currentStage = primary.pipeline;
          }
        }
      }

      // Direction B: students-list quick-update → mirror to ALL admissionDetails entries
      const bodyKeys = Object.keys(body);
      const isQuickSync =
        !body.admissionDetails &&
        bodyKeys.length > 0 &&
        bodyKeys.every((k) => QUICK_SYNC_FIELDS.has(k));

      if (isQuickSync) {
        if (body.stage !== undefined) {
          const mappedPipeline = stageToPipelineMapping[body.stage as string];
          if (mappedPipeline) {
            setFields.currentStage = mappedPipeline;
          }
        }
        const rawDetails = Array.isArray(existingStudent.admissionDetails) ? existingStudent.admissionDetails : [];
        const nextRows: Record<string, unknown>[] = rawDetails.map((row: unknown) => {
          const next: Record<string, unknown> = { ...(row as Record<string, unknown>) };
          const rowCountry = String(next.country ?? "");
          if (countryHasVisaApproved(existingStudent.countries, rowCountry)) {
            return next;
          }
          if (body.stage !== undefined) {
            next.stage = body.stage;
            const mappedPipeline = stageToPipelineMapping[body.stage as string];
            if (mappedPipeline) next.pipeline = mappedPipeline;
          }
          if (body.remarks !== undefined) next.remarks = body.remarks;
          if (body.standing !== undefined) next.standing = body.standing;
          return next;
        });
        setFields.admissionDetails = mergeAdmissionDetailTrackingHistory(
          rawDetails as unknown[],
          nextRows,
          session.user,
        );
      }

      update = { $set: setFields };
    }

    const student = await Student.findByIdAndUpdate(id, update, { returnDocument: "after", runValidators: false })
      .populate("branch", "name location")
      .populate("counsellor", "name email")
      .lean();
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    return NextResponse.json(student);
  } catch (err) {
    console.error("PATCH /api/students/[id] error:", err);
    return NextResponse.json({ error: "Failed to update student" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();
    const body = await req.json();

    const student = await Student.findById(id);
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    if (body.visaApproved && body.country != null) {
      const countryName = String(body.country);
      const countrySub = student.countries.find(
        (c: { country?: string }) => c.country === countryName,
      );
      if (!countrySub) {
        return NextResponse.json({ error: "Country not found on student" }, { status: 400 });
      }
      const hadApproval = countrySub.visaApprovedAt != null;
      if (!hadApproval) {
        await User.findByIdAndUpdate(student.counsellor, { $inc: { target: -1 } });
        await ActivityLog.create({
          user: session.user.id,
          userName: session.user.name,
          userRole: session.user.role,
          action: "VISA_APPROVED",
          module: "Students",
          targetId: id,
          targetName: student.name,
          details: `Visa approved for ${countryName}. Counsellor target decremented.`,
        });
      }
      countrySub.visaApprovedAt = new Date();
      if (!countrySub.visaStatus?.trim()) {
        countrySub.visaStatus = "Approved";
      }
      await student.save();
      const updated = await Student.findById(id)
        .populate("branch", "name location")
        .populate("counsellor", "name email")
        .lean();
      return NextResponse.json(updated);
    }

    const updated = await Student.findByIdAndUpdate(id, body, { returnDocument: "after" })
      .populate("branch", "name location")
      .populate("counsellor", "name email")
      .lean();
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update student" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    await connectDB();
    const student = await Student.findByIdAndDelete(id);
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    await ActivityLog.create({
      user: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "DELETE",
      module: "Students",
      targetId: id,
      targetName: student.name,
      details: `Deleted student ${student.name}`,
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete student" }, { status: 500 });
  }
}
