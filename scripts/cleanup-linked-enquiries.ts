/**
 * Remove legacy enquiry rows that mirrored CRM leads (linkedLeadId set).
 * Usage: npx tsx --env-file=.env.local scripts/cleanup-linked-enquiries.ts [--execute]
 */
import connectDB from "@/lib/mongodb";
import Enquiry from "@/models/Enquiry";

const execute = process.argv.includes("--execute");

async function main() {
  await connectDB();
  const count = await Enquiry.countDocuments({
    linkedLeadId: { $exists: true, $ne: null },
  });
  console.log(`Legacy lead mirrors in enquiries collection: ${count}`);
  if (!execute) {
    console.log("Dry run. Re-run with --execute to delete.");
    return;
  }
  const result = await Enquiry.deleteMany({
    linkedLeadId: { $exists: true, $ne: null },
  });
  console.log(`Deleted ${result.deletedCount} row(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
