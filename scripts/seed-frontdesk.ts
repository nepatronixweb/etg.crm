/**
 * Front Desk Database Seed
 * Run: npx ts-node scripts/seed-frontdesk.ts
 *
 * Requires MONGODB_URI in .env.local pointing to your MongoDB Atlas cluster.
 * Creates: 1 branch + 1 front_desk user
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not set. Add it to .env.local first.");
  process.exit(1);
}

const BranchSchema = new mongoose.Schema(
  {
    name: String,
    location: String,
    phone: String,
    email: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: String,
    branch: mongoose.Schema.Types.ObjectId,
    phone: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

async function seed() {
  await mongoose.connect(MONGODB_URI!);
  console.log("✅ Connected to MongoDB Atlas");

  const Branch = mongoose.models.Branch || mongoose.model("Branch", BranchSchema);
  const User = mongoose.models.User || mongoose.model("User", UserSchema);

  // ── Branch ────────────────────────────────────────────────────────────────
  let branch = await Branch.findOne({ name: "Kathmandu - Main" });
  if (!branch) {
    branch = await Branch.create({
      name: "Kathmandu - Main",
      location: "Kathmandu, Nepal",
      phone: "+977-1-4444444",
      email: "ktm@etg.com",
    });
    console.log("✅ Branch created:", branch.name);
  } else {
    console.log("ℹ️  Branch already exists:", branch.name);
  }

  // ── Front Desk User ───────────────────────────────────────────────────────
  const existingUser = await User.findOne({ email: "frontdesk@etg.com" });
  if (existingUser) {
    console.log("ℹ️  Front Desk user already exists:", existingUser.email);
  } else {
    const password = await bcrypt.hash("FrontDesk@123", 10);
    const user = await User.create({
      name: "Front Desk Staff",
      email: "frontdesk@etg.com",
      password,
      role: "front_desk",
      branch: branch._id,
      phone: "+977-9800000001",
      isActive: true,
    });
    console.log("✅ Front Desk user created:", user.email);
  }

  console.log("\n🎉 Front Desk seed complete!");
  console.log("──────────────────────────────────");
  console.log("Email   : frontdesk@etg.com");
  console.log("Password: FrontDesk@123");
  console.log("Role    : front_desk");
  console.log("──────────────────────────────────");
  console.log("⚠️  Change the password after first login.");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
