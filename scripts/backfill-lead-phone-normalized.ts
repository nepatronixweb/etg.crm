/**
 * Backfill phoneNormalized on all leads and enquiries for duplicate detection.
 * Usage: npx tsx --env-file=.env.local scripts/backfill-lead-phone-normalized.ts
 */
import mongoose from "mongoose";
import Lead from "../models/Lead";
import Enquiry from "../models/Enquiry";
import { normalizeLeadPhone } from "../lib/leadDuplicateGuard";

async function backfillCollection(
  label: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Model: mongoose.Model<any>
) {
  const cursor = Model.find({
    $or: [
      { phoneNormalized: { $exists: false } },
      { phoneNormalized: "" },
      { phoneNormalized: null },
    ],
    phone: { $exists: true, $nin: ["", null] },
  })
    .select("_id phone phoneNormalized")
    .cursor();

  let updated = 0;
  for await (const doc of cursor) {
    const norm = normalizeLeadPhone(String(doc.phone ?? ""));
    if (!norm) continue;
    if (doc.phoneNormalized === norm) continue;
    await Model.updateOne({ _id: doc._id }, { $set: { phoneNormalized: norm } });
    updated++;
  }
  console.log(`${label}: backfilled ${updated} records`);
  return updated;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");

  await mongoose.connect(uri);
  console.log("Database:", mongoose.connection.db!.databaseName);

  const leadCount = await backfillCollection("Leads", Lead);
  const enquiryCount = await backfillCollection("Enquiries", Enquiry);

  console.log(`\nDone. Total updated: ${leadCount + enquiryCount}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
