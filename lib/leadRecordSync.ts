import mongoose from "mongoose";
import Student from "@/models/Student";

type CountryRow = { country: string; universityName?: string };
type StudentCountry = CountryRow & {
  status?: string;
  applicationStatus?: string;
  admissionStatus?: string;
  visaStatus?: string;
  visaApprovedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
};

/** Keep interestedCountry aligned with interestedCountries[0] when the array is saved. */
export function normalizeLeadCountryFields(fields: Record<string, unknown>): void {
  if (!Array.isArray(fields.interestedCountries)) return;
  const valid: CountryRow[] = (fields.interestedCountries as CountryRow[])
    .map((e) => ({
      country: String(e.country ?? "").trim(),
      universityName: String(e.universityName ?? "").trim(),
    }))
    .filter((e) => e.country);
  fields.interestedCountries = valid;
  if (valid.length > 0) {
    fields.interestedCountry = valid[0].country;
  }
}

export function mergeLeadCountriesIntoStudentCountries(
  leadCountries: CountryRow[],
  studentCountries: StudentCountry[]
): StudentCountry[] {
  if (leadCountries.length === 0) return studentCountries;

  return leadCountries.map((lc) => {
    const key = lc.country.trim().toLowerCase();
    const existing = studentCountries.find((sc) => sc.country.trim().toLowerCase() === key);
    if (existing) {
      return {
        ...existing,
        country: lc.country.trim(),
        universityName: lc.universityName?.trim() || existing.universityName || "",
      };
    }
    return {
      country: lc.country.trim(),
      universityName: lc.universityName?.trim() || "",
      status: "counsellor",
    };
  });
}

type LeadSyncSource = {
  _id: mongoose.Types.ObjectId | string;
  convertedToStudent?: boolean;
  name?: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
  source?: string;
  standing?: string;
  branch?: mongoose.Types.ObjectId | string;
  assignedTo?: mongoose.Types.ObjectId | string;
  interestedCountry?: string;
  interestedCountries?: CountryRow[];
};

/** Mirror CRM lead edits onto the linked student so all departments see the same data. */
export async function syncLeadToLinkedStudent(lead: LeadSyncSource): Promise<void> {
  if (!lead.convertedToStudent) return;

  const student = await Student.findOne({ lead: lead._id });
  if (!student) return;

  const set: Record<string, unknown> = {};

  if (lead.name?.trim()) set.name = lead.name.trim();
  if (lead.phone?.trim()) set.phone = lead.phone.trim();
  if (lead.email !== undefined) set.email = String(lead.email ?? "").trim();
  if (lead.dateOfBirth !== undefined) set.dateOfBirth = lead.dateOfBirth;
  if (lead.source) set.source = lead.source;
  if (lead.standing) set.standing = lead.standing;
  if (lead.branch) set.branch = lead.branch;
  if (lead.assignedTo) set.counsellor = lead.assignedTo;

  const leadCountries: CountryRow[] =
    Array.isArray(lead.interestedCountries) && lead.interestedCountries.length > 0
      ? lead.interestedCountries
      : lead.interestedCountry?.trim()
        ? [{ country: lead.interestedCountry.trim(), universityName: "" }]
        : [];

  if (leadCountries.length > 0) {
    const existing = (student.countries ?? []) as unknown as StudentCountry[];
    set.countries = mergeLeadCountriesIntoStudentCountries(leadCountries, existing);
  }

  if (Object.keys(set).length === 0) return;
  await Student.updateOne({ _id: student._id }, { $set: set });
}
