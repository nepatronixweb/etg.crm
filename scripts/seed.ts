/**
 * Full Database Seed
 * Usage:
 *   npx ts-node -r dotenv/config scripts/seed.ts
 *
 * Requires MONGODB_URI in .env.local (MongoDB Atlas connection string).
 * Safe to run multiple times — skips records that already exist.
 *
 * Seeded collections:
 *   branches, users, appsettings, checklists
 */

import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI is not set. Add it to .env.local first.");
  process.exit(1);
}

// ── Inline schemas (avoids circular import issues in ts-node) ─────────────────

const BranchSchema = new mongoose.Schema(
  { name: String, location: String, phone: String, email: String, isActive: { type: Boolean, default: true } },
  { timestamps: true }
);

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, lowercase: true },
    password: String,
    role: {
      type: String,
      enum: ["super_admin", "counsellor", "telecaller", "application_team", "admission_team", "visa_team", "front_desk"],
    },
    branch: mongoose.Schema.Types.ObjectId,
    phone: String,
    dateOfBirth: String,
    target: { type: Number, default: 0 },
    currentCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const AppSettingsSchema = new mongoose.Schema(
  {
    companyName:    { type: String, default: "Education Tree Global" },
    shortCode:      { type: String, default: "ETG" },
    tagline:        { type: String, default: "Your global education partner" },
    logoPath:       { type: String, default: "" },
    faviconPath:    { type: String, default: "" },
    brandColor:     { type: String, default: "#2563eb" },
    address:        { type: String, default: "" },
    phone:          { type: String, default: "" },
    email:          { type: String, default: "" },
    website:        { type: String, default: "" },
    leadStatuses:   { type: [String], default: ["heated", "hot", "warm", "out_of_contact"] },
    leadSources:    { type: [String], default: ["walk_in", "facebook", "whatsapp", "instagram", "website", "referral", "other"] },
    countries: {
      type: [String],
      default: [
        "Australia", "Canada", "United Kingdom", "United States",
        "New Zealand", "Germany", "France", "Japan", "South Korea",
        "Netherlands", "Sweden", "Denmark", "Finland", "Norway",
        "Switzerland", "Austria", "Ireland", "Singapore", "Malaysia",
        "Dubai (UAE)", "Cyprus", "Malta", "Hungary", "Poland", "Czech Republic",
      ],
    },
    services: {
      type: [String],
      default: [
        "Study Abroad", "Language Courses", "University Application",
        "Visa Assistance", "Test Preparation (IELTS/TOEFL)", "Scholarship Guidance",
        "Career Counselling", "Document Verification",
      ],
    },
    enabledModules: {
      type: [String],
      default: ["leads", "students", "documents", "applications", "admissions", "visa", "analytics", "branches", "users", "activity_logs", "settings"],
    },
    smtpHost:      { type: String, default: "" },
    smtpPort:      { type: Number, default: 587 },
    smtpUser:      { type: String, default: "" },
    smtpPass:      { type: String, default: "" },
    emailFromName: { type: String, default: "" },
    paymentQrPath: { type: String, default: "" },
  },
  { timestamps: true }
);

const ChecklistItemSchema = new mongoose.Schema({
  name: String,
  description: String,
  isRequired: { type: Boolean, default: true },
});

const ChecklistSchema = new mongoose.Schema(
  { country: { type: String, unique: true }, documents: [ChecklistItemSchema] },
  { timestamps: true }
);

// ── Connect ───────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(MONGODB_URI!);
  console.log("✅  Connected to MongoDB Atlas\n");

  const Branch     = mongoose.models.Branch     || mongoose.model("Branch",     BranchSchema);
  const User       = mongoose.models.User       || mongoose.model("User",       UserSchema);
  const AppSetting = mongoose.models.AppSetting || mongoose.model("AppSetting", AppSettingsSchema);
  const Checklist  = mongoose.models.Checklist  || mongoose.model("Checklist",  ChecklistSchema);

  // ── 1. Branches ─────────────────────────────────────────────────────────────
  const branchData = [
    { name: "Kathmandu - Main", location: "Kathmandu, Nepal",  phone: "+977-1-4444444",  email: "ktm@etg.com" },
    { name: "Pokhara Branch",   location: "Pokhara, Nepal",    phone: "+977-61-555555",  email: "pkr@etg.com" },
    { name: "Butwal Branch",    location: "Butwal, Nepal",     phone: "+977-71-666666",  email: "btw@etg.com" },
  ];

  const branches: mongoose.Document[] = [];
  for (const b of branchData) {
    let branch = await Branch.findOne({ name: b.name });
    if (!branch) {
      branch = await Branch.create(b);
      console.log(`  ✅  Branch created: ${b.name}`);
    } else {
      console.log(`  ℹ️   Branch exists:  ${b.name}`);
    }
    branches.push(branch);
  }

  // ── 2. Users ─────────────────────────────────────────────────────────────────
  console.log("");
  const password = await bcrypt.hash("Admin@123", 10);
  const fdPassword = await bcrypt.hash("FrontDesk@123", 10);

  const userData = [
    { name: "Super Admin",      email: "admin@etg.com",     password,   role: "super_admin",      branch: (branches[0] as any)._id },
    { name: "Ram Counsellor",   email: "ram@etg.com",       password,   role: "counsellor",       branch: (branches[0] as any)._id, target: 10 },
    { name: "Sita Counsellor",  email: "sita@etg.com",      password,   role: "counsellor",       branch: (branches[1] as any)._id, target: 10 },
    { name: "Maya Telecaller",  email: "maya@etg.com",      password,   role: "telecaller",       branch: (branches[0] as any)._id },
    { name: "Hari Front Desk",  email: "hari@etg.com",      fdPassword, role: "front_desk",       branch: (branches[0] as any)._id },
    { name: "Priya Application",email: "priya@etg.com",     password,   role: "application_team", branch: (branches[0] as any)._id },
    { name: "Ravi Admission",   email: "ravi@etg.com",      password,   role: "admission_team",   branch: (branches[0] as any)._id },
    { name: "Sunil Visa",       email: "sunil@etg.com",     password,   role: "visa_team",        branch: (branches[0] as any)._id },
    { name: "Front Desk 2",     email: "frontdesk2@etg.com",fdPassword, role: "front_desk",       branch: (branches[1] as any)._id },
  ];

  for (const u of userData) {
    const exists = await User.findOne({ email: u.email });
    if (!exists) {
      await User.create(u);
      console.log(`  ✅  User created: ${u.email}  (${u.role})`);
    } else {
      console.log(`  ℹ️   User exists:  ${u.email}`);
    }
  }

  // ── 3. AppSettings (singleton) ───────────────────────────────────────────────
  console.log("");
  const existingSettings = await AppSetting.findOne();
  if (!existingSettings) {
    await AppSetting.create({});
    console.log("  ✅  AppSettings created (defaults)");
  } else {
    console.log("  ℹ️   AppSettings already exists");
  }

  // ── 4. Checklists ─────────────────────────────────────────────────────────────
  console.log("");
  const checklistData = [
    {
      country: "Australia",
      documents: [
        { name: "Valid Passport", isRequired: true },
        { name: "Offer Letter from University", isRequired: true },
        { name: "Genuine Temporary Entrant (GTE) Statement", isRequired: true },
        { name: "Academic Transcripts", isRequired: true },
        { name: "English Proficiency (IELTS/PTE)", isRequired: true },
        { name: "Financial Evidence (Bank Statement)", isRequired: true },
        { name: "Health Insurance (OSHC)", isRequired: true },
        { name: "Overseas Student Health Cover Receipt", isRequired: false },
        { name: "Visa Application Form (157A)", isRequired: true },
        { name: "Passport-size Photos", isRequired: true },
      ],
    },
    {
      country: "Canada",
      documents: [
        { name: "Valid Passport", isRequired: true },
        { name: "Acceptance Letter (DLI)", isRequired: true },
        { name: "Proof of Funds (Bank Statement)", isRequired: true },
        { name: "Academic Transcripts & Certificates", isRequired: true },
        { name: "English Proficiency (IELTS/TOEFL)", isRequired: true },
        { name: "Statement of Purpose (SOP)", isRequired: true },
        { name: "Biometrics", isRequired: true },
        { name: "Medical Exam Results", isRequired: false },
        { name: "Passport-size Photos", isRequired: true },
        { name: "CAQ (Quebec students only)", isRequired: false },
      ],
    },
    {
      country: "United Kingdom",
      documents: [
        { name: "Valid Passport", isRequired: true },
        { name: "CAS (Confirmation of Acceptance for Studies)", isRequired: true },
        { name: "Proof of Funds (£1,334/month)", isRequired: true },
        { name: "Academic Transcripts", isRequired: true },
        { name: "English Proficiency (IELTS/PTE)", isRequired: true },
        { name: "TB Test Certificate (if required)", isRequired: false },
        { name: "ATAS Certificate (if required)", isRequired: false },
        { name: "Passport-size Photos", isRequired: true },
        { name: "IHS Surcharge Receipt", isRequired: true },
      ],
    },
    {
      country: "United States",
      documents: [
        { name: "Valid Passport", isRequired: true },
        { name: "Form I-20 (from SEVP-approved school)", isRequired: true },
        { name: "DS-160 Application Form", isRequired: true },
        { name: "SEVIS Fee Receipt", isRequired: true },
        { name: "Financial Evidence (Bank Statement)", isRequired: true },
        { name: "Academic Transcripts", isRequired: true },
        { name: "English Proficiency (TOEFL/IELTS)", isRequired: true },
        { name: "F-1 Visa Interview Appointment", isRequired: true },
        { name: "Passport-size Photos", isRequired: true },
      ],
    },
    {
      country: "New Zealand",
      documents: [
        { name: "Valid Passport", isRequired: true },
        { name: "Offer of Place from NZ Institution", isRequired: true },
        { name: "Proof of Funds (NZD 15,000/year)", isRequired: true },
        { name: "Academic Transcripts", isRequired: true },
        { name: "English Proficiency (IELTS/PTE)", isRequired: true },
        { name: "Medical & X-ray Certificates", isRequired: false },
        { name: "Passport-size Photos", isRequired: true },
        { name: "Online Student Visa Application (INZ)", isRequired: true },
      ],
    },
  ];

  for (const cl of checklistData) {
    const exists = await Checklist.findOne({ country: cl.country });
    if (!exists) {
      await Checklist.create(cl);
      console.log(`  ✅  Checklist created: ${cl.country}`);
    } else {
      console.log(`  ℹ️   Checklist exists:  ${cl.country}`);
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log("\n──────────────────────────────────────────────────────");
  console.log("🎉  Seed complete!");
  console.log("──────────────────────────────────────────────────────");
  console.log("  Super Admin  : admin@etg.com       | Admin@123");
  console.log("  Front Desk   : hari@etg.com        | FrontDesk@123");
  console.log("  Front Desk 2 : frontdesk2@etg.com  | FrontDesk@123");
  console.log("  Counsellor   : ram@etg.com         | Admin@123");
  console.log("  Application  : priya@etg.com       | Admin@123");
  console.log("  Admission    : ravi@etg.com        | Admin@123");
  console.log("  Visa         : sunil@etg.com       | Admin@123");
  console.log("──────────────────────────────────────────────────────");
  console.log("⚠️   Change all passwords after first login in production.");
  console.log("──────────────────────────────────────────────────────\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
