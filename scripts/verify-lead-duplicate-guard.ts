/**
 * Verify lead duplicate guard (offline + optional live DB).
 * Usage: npx tsx scripts/verify-lead-duplicate-guard.ts
 *        npx tsx --env-file=.env.local scripts/verify-lead-duplicate-guard.ts
 */
import mongoose from "mongoose";
import Lead from "../models/Lead";
import {
  dedupeLeadRecords,
  leadDuplicateGroupKey,
  normalizeLeadPhone,
  pickPreferredLead,
} from "../lib/leadDuplicateGuard";

function assertCheck(label: string, ok: boolean, detail: string) {
  console.log(`${ok ? "PASS" : "FAIL"} | ${label}: ${detail}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  console.log("=== Lead duplicate guard verification ===\n");

  assertCheck("normalize strips formatting", normalizeLeadPhone("+977-986-0384050") === "9860384050", normalizeLeadPhone("+977-986-0384050"));
  assertCheck(
    "same branch+phone share key",
    leadDuplicateGroupKey("branch1", "9860384050") === leadDuplicateGroupKey("branch1", "+9779860384050"),
    leadDuplicateGroupKey("branch1", "9860384050")
  );
  assertCheck(
    "different branch different key",
    leadDuplicateGroupKey("branch1", "9860384050") !== leadDuplicateGroupKey("branch2", "9860384050"),
    "keys differ"
  );

  const registered = {
    _id: "a",
    branch: "b1",
    phone: "9860384050",
    status: "REGISTERED",
    createdAt: "2026-05-29",
  };
  const assigned = {
    _id: "b",
    branch: "b1",
    phone: "9860384050",
    status: "Assigned",
    createdAt: "2026-06-12",
  };
  const kept = pickPreferredLead(assigned, registered);
  assertCheck("REGISTERED wins over Assigned", kept._id === "a", `kept=${kept._id}`);

  const deduped = dedupeLeadRecords([assigned, registered]);
  assertCheck("dedupe returns one Subash-like row", deduped.length === 1 && deduped[0]._id === "a", `count=${deduped.length}, id=${deduped[0]?._id}`);

  const uri = process.env.MONGODB_URI;
  if (uri) {
    console.log("\n--- Live duplicate scan ---");
    await mongoose.connect(uri);
    const dupGroups = await Lead.aggregate([
      { $match: { phoneNormalized: { $exists: true, $ne: "" } } },
      {
        $group: {
          _id: { branch: "$branch", phone: "$phoneNormalized" },
          n: { $sum: 1 },
          names: { $addToSet: "$name" },
        },
      },
      { $match: { n: { $gt: 1 } } },
      { $limit: 10 },
    ]);
    console.log(`Found ${dupGroups.length} duplicate phone groups (showing up to 10).`);
    for (const g of dupGroups) {
      console.log(`  - ${g.names?.join(", ")} | branch=${g._id.branch} phone=${g._id.phone} count=${g.n}`);
    }
    assertCheck("live scan completed", true, `${dupGroups.length} groups listed (list API dedupes these)`);
    await mongoose.disconnect();
  } else {
    console.log("\n(skip live DB scan — MONGODB_URI not set)");
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
