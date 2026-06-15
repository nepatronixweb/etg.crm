/**
 * Verify lead CRM edits propagate to linked student records.
 * Usage: npx tsx --env-file=.env.local scripts/verify-lead-student-sync.ts
 */
import mongoose from "mongoose";
import Lead from "../models/Lead";
import Student from "../models/Student";
import {
  mergeLeadCountriesIntoStudentCountries,
  normalizeLeadCountryFields,
  syncLeadToLinkedStudent,
} from "../lib/leadRecordSync";

function assertCheck(label: string, ok: boolean, detail: string) {
  console.log(`${ok ? "PASS" : "FAIL"} | ${label}: ${detail}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  console.log("=== Lead → Student CRM sync verification ===\n");

  const fields: Record<string, unknown> = {
    interestedCountries: [{ country: "Australia", universityName: "Monash" }],
    interestedCountry: "United Kingdom",
  };
  normalizeLeadCountryFields(fields);
  assertCheck(
    "normalizeLeadCountryFields picks array over legacy field",
    fields.interestedCountry === "Australia",
    `interestedCountry=${fields.interestedCountry}`
  );

  const merged = mergeLeadCountriesIntoStudentCountries(
    [{ country: "Australia", universityName: "Monash" }],
    [{ country: "United Kingdom", universityName: "", status: "application", visaStatus: "pending" }]
  );
  assertCheck(
    "merge replaces destinations from lead while preserving status on match",
    merged.length === 1 && merged[0].country === "Australia" && merged[0].status === "counsellor",
    JSON.stringify(merged)
  );

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log("\n(skip live DB check — MONGODB_URI not set)");
    console.log("\nDone.");
    return;
  }

  await mongoose.connect(uri);
  const converted = await Lead.findOne({ convertedToStudent: true }).select("_id name").lean();
  if (!converted) {
    console.log("\n(skip live DB — no converted lead found)");
    await mongoose.disconnect();
    console.log("\nDone.");
    return;
  }

  const studentBefore = await Student.findOne({ lead: converted._id }).lean();
  if (!studentBefore) {
    console.log("\n(skip live DB — no linked student for converted lead)");
    await mongoose.disconnect();
    console.log("\nDone.");
    return;
  }

  const leadBefore = await Lead.findById(converted._id).lean();
  const marker = `__sync_verify_${Date.now()}`;
  await Lead.findByIdAndUpdate(converted._id, {
    $set: {
      name: marker,
      interestedCountries: [{ country: "Australia", universityName: "Sync Test Uni" }],
      interestedCountry: "Australia",
    },
  });
  const updatedLead = await Lead.findById(converted._id).lean();
  if (!updatedLead) throw new Error("lead missing after update");

  await syncLeadToLinkedStudent(updatedLead);
  const studentAfter = await Student.findOne({ lead: converted._id }).lean();

  assertCheck(
    "live sync copies name to student",
    studentAfter?.name === marker,
    `student.name=${studentAfter?.name}`
  );
  assertCheck(
    "live sync copies countries to student",
    Array.isArray(studentAfter?.countries) &&
      studentAfter.countries.some((c: { country?: string }) => c.country === "Australia"),
    JSON.stringify(studentAfter?.countries)
  );

  if (leadBefore) {
    await Lead.findByIdAndUpdate(converted._id, {
      $set: {
        name: leadBefore.name,
        interestedCountries: leadBefore.interestedCountries,
        interestedCountry: leadBefore.interestedCountry,
      },
    });
    await syncLeadToLinkedStudent(await Lead.findById(converted._id).lean());
  }

  await mongoose.disconnect();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
