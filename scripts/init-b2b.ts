import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import mongoose from "mongoose";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection.db!;

  // Initialize b2bNames field if missing
  const result = await db.collection("appsettings").updateOne(
    { b2bNames: { $exists: false } },
    { $set: { b2bNames: [] } }
  );
  console.log("Updated appsettings:", result.modifiedCount, "document(s)");

  // Check students with b2b data
  const students = await db.collection("students").find({
    "admissionDetails.b2bName": { $exists: true, $ne: "" }
  }).project({ name: 1, "admissionDetails.b2bName": 1, "admissionDetails.b2bAgentType": 1 }).toArray();
  console.log("Students with B2B data:", students.length);
  if (students.length > 0) console.log(JSON.stringify(students, null, 2));

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
