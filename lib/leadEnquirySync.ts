import mongoose from "mongoose";
import Enquiry from "@/models/Enquiry";

/** Lead-only fields; enquiry mirror is for the telecaller pool (visit capture stays on Lead). */
const OMIT_FROM_ENQUIRY = new Set([
  "_id",
  "__v",
  "visitCaptured",
  "visitedAt",
  "visitPurpose",
  "captureVisits",
  "createdAt",
  "updatedAt",
]);

/** Only true enquiry rows — excludes CRM lead mirrors (`linkedLeadId`). */
export const nativeEnquiryOnlyMatch = {
  $or: [{ linkedLeadId: { $exists: false } }, { linkedLeadId: null }],
} as const;

export function buildEnquirySetFromLead(lead: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(lead)) {
    if (OMIT_FROM_ENQUIRY.has(k)) continue;
    out[k] = v;
  }
  return out;
}

export function leadDocToPlain(lead: unknown): Record<string, unknown> {
  if (lead && typeof lead === "object" && "toObject" in lead && typeof (lead as { toObject: () => unknown }).toObject === "function") {
    return (lead as { toObject: () => Record<string, unknown> }).toObject();
  }
  return { ...(lead as Record<string, unknown>) };
}

/**
 * @deprecated CRM leads must stay in /leads only. Kept for cleanup of legacy mirrors on lead delete.
 */
export async function upsertEnquiryFromLead(
  leadId: mongoose.Types.ObjectId | string,
  _lead: unknown
): Promise<void> {
  void _lead;
  const id = typeof leadId === "string" ? new mongoose.Types.ObjectId(leadId) : leadId;
  await Enquiry.deleteMany({ linkedLeadId: id });
}

export async function deleteEnquiryByLinkedLead(leadId: mongoose.Types.ObjectId | string): Promise<void> {
  const id = typeof leadId === "string" ? new mongoose.Types.ObjectId(leadId) : leadId;
  await Enquiry.deleteMany({ linkedLeadId: id });
}
