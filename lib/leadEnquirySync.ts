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
 * Keeps a parallel Enquiry row so telecallers (GET /api/enquiries) see CRM leads
 * including walk-in/office visits mirrored from Lead.
 */
export async function upsertEnquiryFromLead(
  leadId: mongoose.Types.ObjectId | string,
  lead: unknown
): Promise<void> {
  const id = typeof leadId === "string" ? new mongoose.Types.ObjectId(leadId) : leadId;
  const plain = leadDocToPlain(lead);
  const set = buildEnquirySetFromLead(plain);
  set.linkedLeadId = id;
  await Enquiry.findOneAndUpdate({ linkedLeadId: id }, { $set: set }, { upsert: true, new: true });
}

export async function deleteEnquiryByLinkedLead(leadId: mongoose.Types.ObjectId | string): Promise<void> {
  const id = typeof leadId === "string" ? new mongoose.Types.ObjectId(leadId) : leadId;
  await Enquiry.deleteMany({ linkedLeadId: id });
}
