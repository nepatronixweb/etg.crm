import mongoose from "mongoose";
import Lead from "@/models/Lead";
import Enquiry from "@/models/Enquiry";
import Student from "@/models/Student";
import User from "@/models/User";

const VALID_SOURCES = ["walk_in", "facebook", "whatsapp", "instagram", "website", "referral", "other"];

type CountryInput = { country: string; universityName?: string };

export type ConversionSource = {
  _id: mongoose.Types.ObjectId | string;
  name?: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
  source?: string;
  standing?: string;
  branch?: mongoose.Types.ObjectId | string;
  assignedTo?: mongoose.Types.ObjectId | string;
  interestedCountry?: string;
  interestedCountries?: CountryInput[];
  convertedToStudent?: boolean;
};

function normalizeSource(source?: string): string {
  return VALID_SOURCES.includes(source ?? "") ? source! : "other";
}

function buildCountriesArray(source: ConversionSource): { country: string; universityName?: string; status: string }[] {
  if (Array.isArray(source.interestedCountries) && source.interestedCountries.length > 0) {
    return source.interestedCountries
      .map((c) => ({
        country: String(c.country ?? "").trim(),
        universityName: String(c.universityName ?? "").trim(),
        status: "counsellor",
      }))
      .filter((c) => c.country);
  }
  const legacy = String(source.interestedCountry ?? "").trim();
  if (legacy) return [{ country: legacy, universityName: "", status: "counsellor" }];
  return [{ country: "Unknown", universityName: "", status: "counsellor" }];
}

async function resolveBranchAndCounsellor(
  source: ConversionSource,
  fallbackUserId?: string
): Promise<{ branch?: mongoose.Types.ObjectId; counsellor?: mongoose.Types.ObjectId }> {
  let branchId: mongoose.Types.ObjectId | undefined;
  let counsellorId: mongoose.Types.ObjectId | undefined;

  if (source.branch && mongoose.Types.ObjectId.isValid(String(source.branch))) {
    branchId = new mongoose.Types.ObjectId(String(source.branch));
  }

  if (source.assignedTo && mongoose.Types.ObjectId.isValid(String(source.assignedTo))) {
    counsellorId = new mongoose.Types.ObjectId(String(source.assignedTo));
  } else if (fallbackUserId && mongoose.Types.ObjectId.isValid(fallbackUserId)) {
    counsellorId = new mongoose.Types.ObjectId(fallbackUserId);
  }

  if (!branchId && counsellorId) {
    const u = await User.findById(counsellorId).select("branch").lean();
    if (u?.branch && mongoose.Types.ObjectId.isValid(String(u.branch))) {
      branchId = new mongoose.Types.ObjectId(String(u.branch));
    }
  }

  return { branch: branchId, counsellor: counsellorId };
}

async function alignStudentWithSource(
  student: mongoose.Document & { branch?: mongoose.Types.ObjectId; counsellor?: mongoose.Types.ObjectId },
  source: ConversionSource
): Promise<typeof student> {
  const patches: Record<string, unknown> = {};
  if (source.branch && String(student.branch ?? "") !== String(source.branch)) {
    patches.branch = source.branch;
  }
  if (source.assignedTo && String(student.counsellor ?? "") !== String(source.assignedTo)) {
    patches.counsellor = source.assignedTo;
  }
  if (Object.keys(patches).length > 0) {
    await Student.updateOne({ _id: student._id }, { $set: patches });
    const refreshed = await Student.findById(student._id);
    if (refreshed) return refreshed;
  }
  return student;
}

/**
 * Ensure a Student row exists when a Lead is marked converted.
 * Repairs orphaned conversions (converted flag set but no student) and branch/counsellor drift.
 */
export async function ensureStudentForConvertedLead(
  lead: ConversionSource,
  options?: { actorUserId?: string }
): Promise<(mongoose.Document & Record<string, unknown>) | null> {
  const leadId =
    typeof lead._id === "string" ? new mongoose.Types.ObjectId(lead._id) : lead._id;

  let student = await Student.findOne({ lead: leadId });
  if (student) {
    student = await alignStudentWithSource(student, lead);
    if (!lead.convertedToStudent) {
      await Lead.updateOne({ _id: leadId }, { $set: { convertedToStudent: true } });
    }
    return student;
  }

  if (!lead.convertedToStudent) return null;

  const { branch, counsellor } = await resolveBranchAndCounsellor(lead, options?.actorUserId);
  if (!branch || !counsellor) {
    console.error(
      `[ensureStudentForConvertedLead] cannot repair lead ${leadId.toString()}: missing branch or counsellor`
    );
    return null;
  }

  student = await Student.create({
    lead: leadId,
    name: lead.name || lead.phone || lead.email || "Unknown Client",
    phone: lead.phone || "",
    email: lead.email || "",
    dateOfBirth: lead.dateOfBirth,
    source: normalizeSource(lead.source),
    branch,
    counsellor,
    currentStage: "counsellor",
    standing: lead.standing || "",
    countries: buildCountriesArray(lead),
  });

  console.info(`[ensureStudentForConvertedLead] repaired orphaned conversion for lead ${leadId.toString()}`);
  return student;
}

/**
 * Ensure a Student row exists when an Enquiry is marked converted.
 */
export async function ensureStudentForConvertedEnquiry(
  enquiry: ConversionSource,
  options?: { actorUserId?: string }
): Promise<(mongoose.Document & Record<string, unknown>) | null> {
  const enquiryId =
    typeof enquiry._id === "string" ? new mongoose.Types.ObjectId(enquiry._id) : enquiry._id;

  let student = await Student.findOne({ enquiry: enquiryId });
  if (student) {
    student = await alignStudentWithSource(student, enquiry);
    if (!enquiry.convertedToStudent) {
      await Enquiry.updateOne({ _id: enquiryId }, { $set: { convertedToStudent: true } });
    }
    return student;
  }

  if (!enquiry.convertedToStudent) return null;

  const { branch, counsellor } = await resolveBranchAndCounsellor(enquiry, options?.actorUserId);
  if (!branch || !counsellor) {
    console.error(
      `[ensureStudentForConvertedEnquiry] cannot repair enquiry ${enquiryId.toString()}: missing branch or counsellor`
    );
    return null;
  }

  student = await Student.create({
    enquiry: enquiryId,
    name: enquiry.name || enquiry.phone || enquiry.email || "Unknown Client",
    phone: enquiry.phone || "",
    email: enquiry.email || "",
    dateOfBirth: enquiry.dateOfBirth,
    source: normalizeSource(enquiry.source),
    branch,
    counsellor,
    currentStage: "counsellor",
    standing: enquiry.standing || "",
    countries: buildCountriesArray(enquiry),
  });

  console.info(`[ensureStudentForConvertedEnquiry] repaired orphaned conversion for enquiry ${enquiryId.toString()}`);
  return student;
}

/** Find leads marked converted with no linked student (data integrity check). */
export async function findOrphanedConvertedLeads(limit = 500): Promise<
  Array<{ _id: mongoose.Types.ObjectId; name?: string }>
> {
  const converted = await Lead.find({ convertedToStudent: true })
    .select("_id name")
    .limit(limit)
    .lean();
  const orphans: Array<{ _id: mongoose.Types.ObjectId; name?: string }> = [];
  for (const lead of converted) {
    const hasStudent = await Student.exists({ lead: lead._id });
    if (!hasStudent) orphans.push({ _id: lead._id as mongoose.Types.ObjectId, name: lead.name });
  }
  return orphans;
}

/** Repair all orphaned converted leads/enquiries in bulk. */
export async function repairAllOrphanedConversions(options?: { actorUserId?: string }): Promise<{
  leadsRepaired: number;
  enquiriesRepaired: number;
  leadsFailed: number;
  enquiriesFailed: number;
}> {
  const result = { leadsRepaired: 0, enquiriesRepaired: 0, leadsFailed: 0, enquiriesFailed: 0 };

  const orphanLeads = await findOrphanedConvertedLeads(1000);
  for (const row of orphanLeads) {
    const lead = await Lead.findById(row._id).lean();
    if (!lead) continue;
    const student = await ensureStudentForConvertedLead(lead as ConversionSource, options);
    if (student) result.leadsRepaired += 1;
    else result.leadsFailed += 1;
  }

  const convertedEnquiries = await Enquiry.find({ convertedToStudent: true }).select("_id").lean();
  for (const row of convertedEnquiries) {
    const hasStudent = await Student.exists({ enquiry: row._id });
    if (hasStudent) continue;
    const enquiry = await Enquiry.findById(row._id).lean();
    if (!enquiry) continue;
    const student = await ensureStudentForConvertedEnquiry(enquiry as ConversionSource, options);
    if (student) result.enquiriesRepaired += 1;
    else result.enquiriesFailed += 1;
  }

  return result;
}
