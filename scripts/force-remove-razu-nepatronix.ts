/**
 * FORCE DELETE (irreversible):
 * - Organizations whose name is exactly "razu" or "nepatronix" (case-insensitive)
 * - Any branch whose name starts with "razu" (case-insensitive), even if under another org
 *
 * For every targeted branch it deletes: leads, students, enquiries, users (by branch),
 * then branches, then tenant AppSettings, then organizations.
 *
 * Preview (no writes):
 *   npx tsx --env-file=.env.local scripts/force-remove-razu-nepatronix.ts
 *
 * Apply:
 *   npx tsx --env-file=.env.local scripts/force-remove-razu-nepatronix.ts --execute
 */
import mongoose from "mongoose";
import Organization from "@/models/Organization";
import Branch from "@/models/Branch";
import User from "@/models/User";
import Lead from "@/models/Lead";
import Student from "@/models/Student";
import Enquiry from "@/models/Enquiry";
import AppSettings from "@/models/AppSettings";

const MONGODB_URI = process.env.MONGODB_URI;
const EXECUTE = process.argv.includes("--execute");

const ORG_NAME_PATTERN = /^(razu|nepatronix)$/i;
/** Branch rows whose name starts with "razu" (e.g. Razu, razu, Razu Branch). */
const BRANCH_NAME_RAZU_PREFIX = /^razu/i;

function oidSet(ids: mongoose.Types.ObjectId[]): mongoose.Types.ObjectId[] {
  const seen = new Set<string>();
  const out: mongoose.Types.ObjectId[] = [];
  for (const id of ids) {
    const s = id.toString();
    if (!seen.has(s)) {
      seen.add(s);
      out.push(id);
    }
  }
  return out;
}

async function main() {
  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI is not set. Use: npx tsx --env-file=.env.local scripts/force-remove-razu-nepatronix.ts");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected\n");

  const orgs = await Organization.find({
    name: { $regex: ORG_NAME_PATTERN },
  })
    .select("_id name")
    .lean();

  const orgIds = orgs.map((o) => o._id as mongoose.Types.ObjectId);

  const branchesInOrgs = await Branch.find({ organization: { $in: orgIds } })
    .select("_id name organization")
    .lean();

  const branchesNamedRazu = await Branch.find({ name: { $regex: BRANCH_NAME_RAZU_PREFIX } })
    .select("_id name organization")
    .lean();

  const allBranches = [...branchesInOrgs, ...branchesNamedRazu];
  const branchIds = oidSet(allBranches.map((b) => b._id as mongoose.Types.ObjectId));

  console.log("── Organizations matched ──");
  if (orgs.length === 0) console.log("  (none)");
  else orgs.forEach((o) => console.log(`  • ${o.name} (${o._id})`));

  console.log("\n── Branches targeted ──");
  if (allBranches.length === 0) console.log("  (none)");
  else {
    const seen = new Set<string>();
    for (const b of allBranches) {
      const k = String(b._id);
      if (seen.has(k)) continue;
      seen.add(k);
      const org = b.organization ? String(b.organization) : "—";
      console.log(`  • ${b.name}  branch=${b._id}  org=${org}`);
    }
  }

  if (branchIds.length === 0 && orgIds.length === 0) {
    console.log("\nNothing to do. Exiting.");
    await mongoose.disconnect();
    process.exit(0);
  }

  const [leadCount, studentCount, enquiryCount, userCount] = await Promise.all([
    Lead.countDocuments({ branch: { $in: branchIds } }),
    Student.countDocuments({ branch: { $in: branchIds } }),
    Enquiry.countDocuments({ branch: { $in: branchIds } }),
    User.countDocuments({ branch: { $in: branchIds } }),
  ]);

  console.log("\n── Documents to remove (by branch) ──");
  console.log(`  leads: ${leadCount}, students: ${studentCount}, enquiries: ${enquiryCount}, users: ${userCount}`);
  console.log(`  branches: ${branchIds.length}`);
  console.log(`  organizations: ${orgIds.length} (+ AppSettings per org)`);

  if (!EXECUTE) {
    console.log("\n⚠️  Preview only. To apply deletions, run again with:  --execute");
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log("\n🔥 Executing…");

  const lr = await Lead.deleteMany({ branch: { $in: branchIds } });
  const sr = await Student.deleteMany({ branch: { $in: branchIds } });
  const er = await Enquiry.deleteMany({ branch: { $in: branchIds } });
  const ur = await User.deleteMany({ branch: { $in: branchIds } });
  const br = await Branch.deleteMany({ _id: { $in: branchIds } });

  let settingsRemoved = 0;
  let orgRemoved = 0;
  for (const oid of orgIds) {
    const s = await AppSettings.deleteMany({ organization: oid });
    settingsRemoved += s.deletedCount ?? 0;
    await Branch.deleteMany({ organization: oid });
    const o = await Organization.findByIdAndDelete(oid);
    if (o) orgRemoved += 1;
  }

  console.log("\n✅ Done:");
  console.log(`  deleted leads: ${lr.deletedCount}, students: ${sr.deletedCount}, enquiries: ${er.deletedCount}, users: ${ur.deletedCount}`);
  console.log(`  deleted branches: ${br.deletedCount}`);
  console.log(`  deleted AppSettings rows: ${settingsRemoved}`);
  console.log(`  deleted organizations: ${orgRemoved}`);

  await mongoose.disconnect();
  console.log("\nDisconnected.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
