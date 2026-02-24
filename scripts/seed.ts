import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = "mongodb://localhost:27017/etg-crm";

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  // Define schemas inline
  const BranchSchema = new mongoose.Schema({ name: String, location: String, phone: String, email: String, isActive: { type: Boolean, default: true } }, { timestamps: true });
  const UserSchema = new mongoose.Schema({ name: String, email: { type: String, unique: true }, password: String, role: String, branch: mongoose.Schema.Types.ObjectId, dateOfBirth: String, phone: String, target: { type: Number, default: 0 }, currentCount: { type: Number, default: 0 }, isActive: { type: Boolean, default: true } }, { timestamps: true });

  const Branch = mongoose.models.Branch || mongoose.model("Branch", BranchSchema);
  const User = mongoose.models.User || mongoose.model("User", UserSchema);

  // Create branches
  const branches = await Branch.insertMany([
    { name: "Kathmandu - Main", location: "Kathmandu, Nepal", phone: "+977-1-4444444", email: "ktm@etg.com" },
    { name: "Pokhara Branch", location: "Pokhara, Nepal", phone: "+977-61-555555", email: "pkr@etg.com" },
    { name: "Butwal Branch", location: "Butwal, Nepal", phone: "+977-71-666666", email: "btw@etg.com" },
  ]);
  console.log("✅ Branches created");

  // Create users
  const password = await bcrypt.hash("Admin@123", 10);
  await User.insertMany([
    { name: "Super Admin", email: "admin@etg.com", password, role: "super_admin", branch: branches[0]._id },
    { name: "Ram Counsellor", email: "ram@etg.com", password, role: "counsellor", branch: branches[0]._id, target: 10 },
    { name: "Sita Counsellor", email: "sita@etg.com", password, role: "counsellor", branch: branches[0]._id, target: 10 },
    { name: "Maya Telecaller", email: "maya@etg.com", password, role: "telecaller", branch: branches[0]._id },
    { name: "Hari Front Desk", email: "hari@etg.com", password, role: "front_desk", branch: branches[0]._id },
    { name: "Priya Application", email: "priya@etg.com", password, role: "application_team", branch: branches[0]._id },
    { name: "Ravi Admission", email: "ravi@etg.com", password, role: "admission_team", branch: branches[0]._id },
    { name: "Sunil Visa", email: "sunil@etg.com", password, role: "visa_team", branch: branches[0]._id },
  ]);
  console.log("✅ Users created");

  console.log("\n🎉 Seed complete!");
  console.log("Login: admin@etg.com | Password: Admin@123");
  await mongoose.disconnect();
}

seed().catch(console.error);
