/**
 * Backfill: for students with visa approved on a country but admission pipeline still not "Visa".
 * Usage: npx tsx --env-file=.env.local scripts/sync-visa-approved-pipeline.ts [--execute]
 */
import connectDB from "@/lib/mongodb";
import Student from "@/models/Student";
import {
  VISA_APPROVED_DEFAULT_STAGE,
  VISA_PIPELINE_LABEL,
} from "@/lib/studentVisaLock";

const execute = process.argv.includes("--execute");

async function main() {
  await connectDB();
  const students = await Student.find({
    "countries.visaApprovedAt": { $exists: true, $ne: null },
  }).select("_id name countries admissionDetails currentStage stage");

  let touched = 0;
  for (const student of students) {
    const approvedCountries = (student.countries ?? [])
      .filter((c: { visaApprovedAt?: unknown }) => c.visaApprovedAt != null && c.visaApprovedAt !== "")
      .map((c: { country?: string }) => String(c.country ?? ""))
      .filter(Boolean);

    if (approvedCountries.length === 0) continue;

    let changed = false;
    for (const countryName of approvedCountries) {
      for (const detail of student.admissionDetails) {
        const row = detail as { country?: string; pipeline?: string; stage?: string; statusDate?: string };
        if (String(row.country ?? "") !== countryName) continue;
        if (row.pipeline !== VISA_PIPELINE_LABEL) {
          row.pipeline = VISA_PIPELINE_LABEL;
          changed = true;
        }
        if (!String(row.stage ?? "").startsWith("visa_")) {
          row.stage = VISA_APPROVED_DEFAULT_STAGE;
          changed = true;
        }
      }
      const countrySub = student.countries.find((c: { country?: string }) => c.country === countryName) as
        | { status?: string }
        | undefined;
      if (countrySub && countrySub.status !== "visa" && countrySub.status !== "completed") {
        countrySub.status = "visa";
        changed = true;
      }
    }

    const openDetail = [...student.admissionDetails]
      .reverse()
      .find((d: { closed?: boolean }) => !d.closed) as { stage?: string } | undefined;
    if (student.currentStage !== VISA_PIPELINE_LABEL) {
      student.currentStage = VISA_PIPELINE_LABEL;
      changed = true;
    }
    if (openDetail?.stage && student.stage !== openDetail.stage) {
      student.stage = openDetail.stage;
      changed = true;
    }

    if (!changed) continue;
    touched++;
    console.log(`Would update: ${student.name} (${student._id})`);
    if (execute) {
      student.markModified("admissionDetails");
      student.markModified("countries");
      await student.save();
    }
  }

  console.log(
    execute
      ? `Updated ${touched} student(s).`
      : `Dry run: ${touched} student(s) need pipeline sync. Re-run with --execute.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
