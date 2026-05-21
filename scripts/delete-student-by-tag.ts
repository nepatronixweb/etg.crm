/**
 * Find/delete a student by display tag suffix (e.g. 4084 for KATHM-4084), phone, or email.
 *
 * Dry run:
 *   npx tsx --env-file=.env.local scripts/delete-student-by-tag.ts --phone=9840207289
 *   npx tsx --env-file=.env.local scripts/delete-student-by-tag.ts 4084
 *
 * Production (set MONGODB_URI or MONGODB_URI_SOURCE to live cluster):
 *   npx tsx --env-file=.env.local scripts/delete-student-by-tag.ts --phone=9840207289 --execute
 */
import connectDB from "@/lib/mongodb";
import Student from "@/models/Student";
import Document from "@/models/Document";
import Application from "@/models/Application";
import ActivityLog from "@/models/ActivityLog";
import Lead from "@/models/Lead";
import mongoose from "mongoose";
import { mongoDbNameFromUri } from "@/lib/mongodb";

const args = process.argv.slice(2);
const execute = args.includes("--execute");
const suffixArg = args.find((a) => !a.startsWith("--") && /^[0-9A-F]{4}$/i.test(a))?.trim().toUpperCase();
const phoneArg = args.find((a) => a.startsWith("--phone="))?.split("=")[1]?.trim();
const emailArg = args.find((a) => a.startsWith("--email="))?.split("=")[1]?.trim();

async function main() {
  const uri = process.env.MONGODB_URI_SOURCE?.trim() || process.env.MONGODB_URI || "";
  await connectDB();
  console.log("Database:", mongoDbNameFromUri(uri));

  let matches: Awaited<ReturnType<typeof Student.find>> = [];

  if (suffixArg) {
    const candidates = await Student.find({}).select("_id name email phone createdAt lead currentStage").lean();
    matches = candidates.filter((s) => s._id.toString().slice(-4).toUpperCase() === suffixArg) as typeof matches;
  } else if (phoneArg || emailArg) {
    const filter: Record<string, unknown> = {};
    if (phoneArg) filter.phone = phoneArg;
    if (emailArg) filter.email = new RegExp(`^${emailArg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    matches = await Student.find(filter).select("_id name email phone createdAt lead currentStage").lean();
  } else {
    console.error("Provide tag suffix (4084), --phone=..., or --email=...");
    process.exit(1);
  }

  if (matches.length === 0) {
    console.log("No matching student found.");
    process.exit(0);
  }

  if (matches.length > 1) {
    console.log("Multiple matches — pick one and re-run with tag suffix:");
    for (const s of matches) {
      const id = s._id.toString();
      console.log({
        _id: id,
        tag: `KATHM-${id.slice(-4).toUpperCase()}`,
        name: s.name,
        phone: s.phone,
        email: s.email,
        createdAt: s.createdAt,
        currentStage: s.currentStage,
      });
    }
    process.exit(1);
  }

  const student = matches[0]!;
  const id = student._id.toString();
  const tag = `KATHM-${id.slice(-4).toUpperCase()}`;
  console.log("Target student:", {
    _id: id,
    tag,
    name: student.name,
    phone: student.phone,
    email: student.email,
    createdAt: student.createdAt,
    currentStage: student.currentStage,
    lead: student.lead?.toString(),
  });

  const [docs, apps] = await Promise.all([
    Document.countDocuments({ student: id }),
    Application.countDocuments({ student: id }),
  ]);
  console.log(`Related documents: ${docs}, applications: ${apps}`);

  if (!execute) {
    console.log("\nDry run only. Add --execute to delete.");
    process.exit(0);
  }

  await Document.deleteMany({ student: id });
  await Application.deleteMany({ student: id });
  await Student.findByIdAndDelete(id);

  if (student.lead) {
    await Lead.findByIdAndUpdate(student.lead, { $set: { convertedToStudent: false } });
    console.log(`Reset lead ${student.lead.toString()} convertedToStudent → false`);
  }

  await ActivityLog.create({
    user: new mongoose.Types.ObjectId(),
    userName: "System Script",
    userRole: "super_admin",
    action: "DELETE",
    module: "Students",
    targetId: id,
    targetName: student.name,
    details: `Deleted student ${tag} (${student.name}) via delete-student-by-tag script`,
  });

  console.log(`Deleted student ${student.name} (${tag})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
