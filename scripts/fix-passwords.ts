import mongoose from "mongoose";
import bcrypt from "bcryptjs";

async function fixPasswords() {
  const uri = process.env.MONGODB_URI!;
  await mongoose.connect(uri);

  const col = mongoose.connection.collection("users");
  const fdHash = await bcrypt.hash("FrontDesk@123", 10);

  const r1 = await col.updateOne({ email: "hari@etg.com" }, { $set: { password: fdHash } });
  const r2 = await col.updateOne({ email: "frontdesk2@etg.com" }, { $set: { password: fdHash } });

  console.log("hari@etg.com       password fixed:", r1.modifiedCount === 1 ? "✅" : "⚠️ already set or not found");
  console.log("frontdesk2@etg.com password fixed:", r2.modifiedCount === 1 ? "✅" : "⚠️ already set or not found");

  await mongoose.disconnect();
}

fixPasswords().catch(console.error);
