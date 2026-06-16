import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Student from "@/models/Student";
import Lead from "@/models/Lead";
import Enquiry from "@/models/Enquiry";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";
import { auth } from "@/lib/auth";
import { assertOrgPlanLimit } from "@/lib/orgPlanUsage";
import { tenantBranchScopeForSession } from "@/lib/orgUserScope";
import { hasModuleAction } from "@/lib/utils";
import { buildLeadDuplicateQuery, normalizeLeadPhone } from "@/lib/leadDuplicateGuard";
import { normalizeMatchIdsForAggregate } from "@/lib/mongoAggregateMatch";
import {
  ensureStudentForConvertedEnquiry,
  ensureStudentForConvertedLead,
} from "@/lib/ensureStudentFromConversion";
import { findEnquiryInTenant, findLeadInTenant } from "@/lib/tenantRecordAccess";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch");
    const stage = searchParams.get("stage");
    const counsellor = searchParams.get("counsellor");
    const country = searchParams.get("country");
    const leadId = searchParams.get("leadId");
    const enquiryId = searchParams.get("enquiryId");
    const standing = searchParams.get("standing");
    const enrolled = searchParams.get("enrolled");
    const source = searchParams.get("source");
    const crmStage = searchParams.get("crmStage"); // student.stage (CRM pipeline tag)
    const search = searchParams.get("search");
    const visaGrantedOnly =
      searchParams.get("visaGrantedOnly") === "1" || searchParams.get("visaGrantedOnly") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const wantStageBreakdown = searchParams.get("stageBreakdown") === "1";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseParts: Record<string, any>[] = [];

    const tenantScope =
      session.user.role !== "super_admin" ? await tenantBranchScopeForSession(session) : null;

    if (leadId) {
      const leadDoc = await findLeadInTenant(session, leadId);
      if (!leadDoc) {
        return NextResponse.json({ students: [], total: 0, page: 1, pages: 0 });
      }
      await ensureStudentForConvertedLead(leadDoc, { actorUserId: session.user.id });
      baseParts.push({ lead: leadId });
      // Lead access already tenant-scoped; skip duplicate branch filter so repaired rows are visible.
    } else if (enquiryId) {
      const enquiryDoc = await findEnquiryInTenant(session, enquiryId);
      if (!enquiryDoc) {
        return NextResponse.json({ students: [], total: 0, page: 1, pages: 0 });
      }
      await ensureStudentForConvertedEnquiry(enquiryDoc, { actorUserId: session.user.id });
      baseParts.push({ enquiry: enquiryId });
    } else {
      if (session.user.role === "counsellor") baseParts.push({ counsellor: session.user.id });
      else if (tenantScope) baseParts.push(tenantScope);
      if (branch) baseParts.push({ branch });
    }

    if (counsellor) baseParts.push({ counsellor });
    if (country) baseParts.push({ "countries.country": country });
    if (standing) baseParts.push({ standing });
    if (enrolled === "true") baseParts.push({ enrolled: true });
    if (source) baseParts.push({ source });
    if (crmStage) baseParts.push({ stage: crmStage });

    if (visaGrantedOnly) {
      baseParts.push({
        $or: [
          { stage: "visa_grant" },
          { "admissionDetails.stage": "visa_grant" },
          { "countries.visaApprovedAt": { $exists: true, $ne: null } },
          { "countries.visaStatus": { $regex: /grant|approved|ppr|aip/i } },
        ],
      });
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      baseParts.push({ $or: [{ name: regex }, { phone: regex }, { email: regex }] });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listParts: Record<string, any>[] = [...baseParts];
    if (stage) {
      const esc = stage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      listParts.push({ currentStage: { $regex: new RegExp(`^${esc}$`, "i") } });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> =
      listParts.length === 0 ? {} : listParts.length === 1 ? listParts[0] : { $and: listParts };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const breakdownFilter: Record<string, any> =
      baseParts.length === 0 ? {} : baseParts.length === 1 ? baseParts[0] : { $and: baseParts };

    const needsLead = !enrolled && !stage;
    const originSelect =
      "source interestedService interestedCountry interestedCountries parentName parentPhone1 parentPhone2 academicScore academicInstitution temporaryAddress permanentAddress examType examScore examJoinDate examStartDate examEndDate examPaymentMethod examEstimatedDate gender maritalStatus nationality passportNumber visaExpiryDate senderName academicYear passoutYear applyLevel course intakeYear intakeQuarter comments";
    const originWithDates = `${originSelect} statusDates`;
    const leadPopulate = needsLead
      ? [
          { path: "lead", select: originWithDates },
          { path: "enquiry", select: originWithDates },
        ]
      : [
          { path: "lead", select: "statusDates" },
          { path: "enquiry", select: "statusDates" },
        ];

    const skip = (page - 1) * limit;

    // Repair orphaned conversions in tenant so converted leads always appear in Students (all departments).
    if (!leadId && !enquiryId && page === 1) {
      const orphanLeadFilter =
        tenantScope && Object.keys(tenantScope).length > 0
          ? { convertedToStudent: true, ...tenantScope }
          : { convertedToStudent: true };
      const orphanLeads = await Lead.find(orphanLeadFilter).limit(40).lean();
      for (const orphanLead of orphanLeads) {
        const hasStudent = await Student.exists({ lead: orphanLead._id });
        if (!hasStudent) {
          try {
            await ensureStudentForConvertedLead(orphanLead, { actorUserId: session.user.id });
          } catch (repairErr) {
            console.error("[GET /api/students] orphan lead repair failed:", repairErr);
          }
        }
      }
      const orphanEnquiryFilter =
        tenantScope && Object.keys(tenantScope).length > 0
          ? { convertedToStudent: true, ...tenantScope }
          : { convertedToStudent: true };
      const orphanEnquiries = await Enquiry.find(orphanEnquiryFilter).limit(40).lean();
      for (const orphanEnquiry of orphanEnquiries) {
        const hasStudent = await Student.exists({ enquiry: orphanEnquiry._id });
        if (!hasStudent) {
          try {
            await ensureStudentForConvertedEnquiry(orphanEnquiry, { actorUserId: session.user.id });
          } catch (repairErr) {
            console.error("[GET /api/students] orphan enquiry repair failed:", repairErr);
          }
        }
      }
    }

    const aggBreakdownMatch = normalizeMatchIdsForAggregate(breakdownFilter);

    let stageBreakdown: Record<string, number> | undefined;
    const breakdownAggPromise:
      Promise<Array<{ _id: unknown; n: unknown }>>
    = wantStageBreakdown
        ? Student.aggregate([
            { $match: aggBreakdownMatch },
            {
              $group: {
                _id: {
                  $toLower: {
                    $trim: { input: { $ifNull: ["$currentStage", ""] } },
                  },
                },
                n: { $sum: 1 },
              },
            },
          ]).exec()
        : Promise.resolve([]);

    const [students, total, breakdownAgg] = await Promise.all([
      Student.find(filter)
        .populate("branch", "name")
        .populate("counsellor", "name email")
        .populate(leadPopulate)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Student.countDocuments(filter),
      breakdownAggPromise,
    ]);

    if (wantStageBreakdown) {
      stageBreakdown = {};
      for (const row of breakdownAgg) {
        const k = row._id == null ? "" : String(row._id);
        let n = 0;
        const raw = row.n;
        if (typeof raw === "number" && !Number.isNaN(raw)) {
          n = raw;
        } else if (typeof raw === "bigint") {
          n = Number(raw);
        } else if (raw != null && typeof raw === "object" && "toString" in raw && typeof (raw as { toString: () => string }).toString === "function") {
          const x = Number(String(raw));
          if (Number.isFinite(x)) n = x;
        } else {
          const x = Number(raw);
          if (Number.isFinite(x)) n = x;
        }
        stageBreakdown[k] = (stageBreakdown[k] ?? 0) + n;
      }
    }

    return NextResponse.json({
      students,
      total,
      page,
      pages: Math.ceil(total / limit),
      ...(stageBreakdown ? { stageBreakdown } : {}),
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const perms = (session.user.permissions ?? []) as string[];
    if (!hasModuleAction(perms, session.user.role, "students", "add")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await connectDB();

    const body = await req.json();

    // ── Mode 1: Direct creation (full form) ──────────────────────────────────
    if (body.direct) {
      const {
        name, phone, email, dateOfBirth, source,
        interestedService, interestedCountry,
        branch, counsellorId, comments,
      } = body;

      if (session.user.role !== "super_admin" && session.user.organizationId) {
        const limitCheck = await assertOrgPlanLimit(session.user.organizationId, "leads");
        if (!limitCheck.ok) {
          return NextResponse.json({ error: limitCheck.error, code: limitCheck.code }, { status: 403 });
        }
      }

      const studentBranch = branch || session.user.branch;
      const dupQuery = studentBranch && phone ? buildLeadDuplicateQuery(studentBranch, phone) : null;
      if (dupQuery) {
        const existing = await Lead.findOne(dupQuery).select("_id name phone status").lean();
        if (existing) {
          return NextResponse.json(
            {
              error: `A lead with phone ${phone} already exists at this branch (${existing.name}).`,
              code: "DUPLICATE_LEAD",
              existingLeadId: String(existing._id),
              existingLeadName: existing.name,
            },
            { status: 409 }
          );
        }
      }

      const counsellor = counsellorId || session.user.id;

      // Create lead first (converted flag set only after student exists).
      const lead = await Lead.create({
        name, phone, email, dateOfBirth, source,
        interestedService, interestedCountry,
        branch: studentBranch,
        phoneNormalized: normalizeLeadPhone(phone),
        status: "warm",
        assignedTo: counsellorId || undefined,
        assignedBy: counsellorId ? session.user.id : undefined,
        notes: comments ? [{ content: comments, addedBy: session.user.id, addedByName: session.user.name, addedByRole: session.user.role }] : [],
      });

      const student = await Student.create({
        lead: lead._id,
        name, phone, email, dateOfBirth, source,
        branch: branch || session.user.branch,
        counsellor,
        currentStage: "counsellor",
        countries: [{ country: interestedCountry, status: "counsellor" }],
      });

      lead.convertedToStudent = true;
      await lead.save();

      await User.findByIdAndUpdate(counsellor, { $inc: { currentCount: 1 } });

      await ActivityLog.create({
        user: session.user.id,
        userName: session.user.name,
        userRole: session.user.role,
        action: "CREATE",
        module: "Students",
        targetId: student._id.toString(),
        targetName: student.name,
        details: `Student added directly for ${interestedCountry}`,
      });

      return NextResponse.json({ message: "Student created", student }, { status: 201 });
    }

    // ── Mode 2: Convert existing lead or enquiry ─────────────────────────────
    const { leadId, enquiryId, country, countries: countriesInput } = body as {
      leadId?: string;
      enquiryId?: string;
      country?: string;
      countries?: { country: string; universityName?: string }[];
    };

    if (leadId && enquiryId) {
      return NextResponse.json({ error: "Provide either leadId or enquiryId, not both" }, { status: 400 });
    }

    const VALID_SOURCES = ["walk_in", "facebook", "whatsapp", "instagram", "website", "referral", "other"];

    if (enquiryId) {
      const enquiry = await Enquiry.findById(enquiryId);
      if (!enquiry) return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
      if (enquiry.convertedToStudent) {
        const existing = await Student.findOne({ enquiry: enquiryId }).lean();
        if (existing) {
          return NextResponse.json({ message: "Student already exists", student: existing });
        }
        const repaired = await ensureStudentForConvertedEnquiry(enquiry, { actorUserId: session.user.id });
        if (repaired) {
          return NextResponse.json({ message: "Student repaired from enquiry conversion", student: repaired });
        }
        return NextResponse.json(
          { error: "Enquiry marked converted but student record is missing. Assign a counsellor and branch, then retry." },
          { status: 400 }
        );
      }

      const counsellor = enquiry.assignedTo || session.user.id;
      let branch: mongoose.Types.ObjectId | string | undefined = enquiry.branch || session.user.branch;
      if (!branch) {
        const counsellorUser = await User.findById(counsellor).select("branch").lean();
        branch = (counsellorUser as { branch?: mongoose.Types.ObjectId })?.branch?.toString();
      }

      if (!branch) {
        return NextResponse.json(
          { error: "No branch found. Please assign a branch to this enquiry or your user account, then try again." },
          { status: 400 }
        );
      }
      if (!counsellor) return NextResponse.json({ error: "No counsellor assigned" }, { status: 400 });

      const source = VALID_SOURCES.includes(enquiry.source) ? enquiry.source : "other";

      const countriesArray: { country: string; universityName?: string; status: string }[] =
        Array.isArray(countriesInput) && countriesInput.length > 0
          ? countriesInput.map((c) => ({
              country: c.country,
              universityName: c.universityName || "",
              status: "counsellor",
            }))
          : [{ country: country || enquiry.interestedCountry, status: "counsellor" }];

      const student = await Student.create({
        enquiry: enquiryId,
        name: enquiry.name || enquiry.phone || enquiry.email || "Unknown Client",
        phone: enquiry.phone || "",
        email: enquiry.email || "",
        dateOfBirth: enquiry.dateOfBirth,
        source,
        branch,
        counsellor,
        currentStage: "counsellor",
        countries: countriesArray,
      });

      enquiry.convertedToStudent = true;
      await enquiry.save();

      await User.findByIdAndUpdate(counsellor, { $inc: { currentCount: 1 } });

      await ActivityLog.create({
        user: session.user.id,
        userName: session.user.name,
        userRole: session.user.role,
        action: "CONVERT",
        module: "Students",
        targetId: student._id.toString(),
        targetName: student.name,
        details: `Enquiry converted to student for ${country || enquiry.interestedCountry}`,
      });

      return NextResponse.json({ message: "Student created", student }, { status: 201 });
    }

    if (!leadId) {
      return NextResponse.json({ error: "leadId or enquiryId is required" }, { status: 400 });
    }

    const lead = await Lead.findById(leadId);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    if (lead.convertedToStudent) {
      const existing = await Student.findOne({ lead: leadId }).lean();
      if (existing) {
        return NextResponse.json({ message: "Student already exists", student: existing });
      }
      const repaired = await ensureStudentForConvertedLead(lead, { actorUserId: session.user.id });
      if (repaired) {
        return NextResponse.json({ message: "Student repaired from lead conversion", student: repaired });
      }
      return NextResponse.json(
        { error: "Lead marked converted but student record is missing. Assign a counsellor and branch, then retry." },
        { status: 400 }
      );
    }

    const counsellor = lead.assignedTo || session.user.id;

    let branch: mongoose.Types.ObjectId | string | undefined = lead.branch || session.user.branch;
    if (!branch) {
      const counsellorUser = await User.findById(counsellor).select("branch").lean();
      branch = (counsellorUser as { branch?: mongoose.Types.ObjectId })?.branch?.toString();
    }

    if (!branch) return NextResponse.json({ error: "No branch found. Please assign a branch to this lead or your user account, then try again." }, { status: 400 });
    if (!counsellor) return NextResponse.json({ error: "No counsellor assigned" }, { status: 400 });

    const source = VALID_SOURCES.includes(lead.source) ? lead.source : "other";

    const countriesArray: { country: string; universityName?: string; status: string }[] =
      Array.isArray(countriesInput) && countriesInput.length > 0
        ? countriesInput.map((c: { country: string; universityName?: string }) => ({
            country: c.country,
            universityName: c.universityName || "",
            status: "counsellor",
          }))
        : [{ country: country || lead.interestedCountry, status: "counsellor" }];

    const student = await Student.create({
      lead: leadId,
      name: lead.name || lead.phone || lead.email || "Unknown Client",
      phone: lead.phone || "",
      email: lead.email || "",
      dateOfBirth: lead.dateOfBirth,
      source,
      branch,
      counsellor,
      currentStage: "counsellor",
      countries: countriesArray,
    });

    lead.convertedToStudent = true;
    await lead.save();

    await User.findByIdAndUpdate(counsellor, { $inc: { currentCount: 1 } });

    await ActivityLog.create({
      user: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "CONVERT",
      module: "Students",
      targetId: student._id.toString(),
      targetName: student.name,
      details: `Lead converted to student for ${country || lead.interestedCountry}`,
    });

    return NextResponse.json({ message: "Student created", student }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create student";
    console.error("[POST /api/students] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await connectDB();
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    const students = await Student.find({ _id: { $in: ids } }).select("lead enquiry name").lean();
    await Student.deleteMany({ _id: { $in: ids } });
    const leadIds = students.map((s) => s.lead).filter(Boolean);
    const enquiryIds = students.map((s) => s.enquiry).filter(Boolean);
    if (leadIds.length > 0) {
      await Lead.updateMany({ _id: { $in: leadIds } }, { $set: { convertedToStudent: false } });
    }
    if (enquiryIds.length > 0) {
      await Enquiry.updateMany({ _id: { $in: enquiryIds } }, { $set: { convertedToStudent: false } });
    }
    return NextResponse.json({ message: `Deleted ${ids.length} students` });
  } catch {
    return NextResponse.json({ error: "Failed to delete students" }, { status: 500 });
  }
}
