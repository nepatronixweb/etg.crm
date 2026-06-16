/**
 * Repair leads/enquiries marked converted but missing a Student record.
 * Usage: npx tsx --env-file=.env.local scripts/repair-converted-leads.ts
 */
import mongoose from "mongoose";
import {
  findOrphanedConvertedLeads,
  repairAllOrphanedConversions,
} from "../lib/ensureStudentFromConversion";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set");
    process.exit(1);
  }

  await mongoose.connect(uri);

  const orphans = await findOrphanedConvertedLeads(2000);
  console.log(`Found ${orphans.length} converted lead(s) without a student record.`);
  if (orphans.length > 0) {
    console.log(
      orphans
        .slice(0, 20)
        .map((o) => `  - ${o._id.toString()} ${o.name ?? ""}`)
        .join("\n")
    );
    if (orphans.length > 20) console.log(`  ... and ${orphans.length - 20} more`);
  }

  const result = await repairAllOrphanedConversions();
  console.log("\nRepair summary:");
  console.log(`  Leads repaired:     ${result.leadsRepaired}`);
  console.log(`  Leads failed:       ${result.leadsFailed}`);
  console.log(`  Enquiries repaired: ${result.enquiriesRepaired}`);
  console.log(`  Enquiries failed:   ${result.enquiriesFailed}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
