/**
 * Upsert real counsellor accounts
 * Run: npx ts-node -r dotenv/config scripts/upsert-counsellors.ts
 */

import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error("❌ MONGODB_URI not set"); process.exit(1); }

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, lowercase: true },
    password: String,
    role: String,
    branch: mongoose.Schema.Types.ObjectId,
    phone: String,
    target: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const BranchSchema = new mongoose.Schema({ name: String }, { timestamps: true });

async function run() {
  await mongoose.connect(MONGODB_URI!);
  console.log("✅ Connected to MongoDB\n");

  const User   = mongoose.models.User   || mongoose.model("User",   UserSchema);
  const Branch = mongoose.models.Branch || mongoose.model("Branch", BranchSchema);

  const mainBranch = await Branch.findOne({ name: "Kathmandu - Main" });
  if (!mainBranch) { console.error("❌ Branch 'Kathmandu - Main' not found. Run seed.ts first."); process.exit(1); }

  const counsellors = [
    { name: "Soni Shah",      email: "soni@etg.com",   password: "Soni@123"   },
    { name: "Mahesh Mainali", email: "mahesh@etg.com", password: "Mahesh@123" },
    { name: "Ayusha Shahi",   email: "ayusha@etg.com", password: "Ayusha@123" },
    { name: "Shreya Thapa",   email: "shreya@etg.com", password: "Shreya@123" },
  ];

  for (const c of counsellors) {
    const hashed = await bcrypt.hash(c.password, 10);
    const result = await User.findOneAndUpdate(
      { email: c.email },
      { $set: { name: c.name, email: c.email, password: hashed, role: "counsellor", branch: (mainBranch as any)._id, target: 10, isActive: true } },
      { upsert: true, new: true }
    );
    console.log(`✅ ${result.name} — ${result.email} (${c.password})`);
  }

  console.log("\n──────────────────────────────────────────");
  console.log("Counsellor      │ Email              │ Password");
  console.log("────────────────┼────────────────────┼──────────────");
  console.log("Soni Shah       │ soni@etg.com       │ Soni@123");
  console.log("Mahesh Mainali  │ mahesh@etg.com     │ Mahesh@123");
  console.log("Ayusha Shahi    │ ayusha@etg.com     │ Ayusha@123");
  console.log("──────────────────────────────────────────");

  await mongoose.disconnect();
}

run().catch(err => { console.error("❌", err); process.exit(1); });
