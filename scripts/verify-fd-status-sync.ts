/**
 * Cross-verify Front Desk status persistence (Settings → all staff).
 * Usage: npx tsx --env-file=.env.local scripts/verify-fd-status-sync.ts
 */
import mongoose from "mongoose";
import AppSettings from "../models/AppSettings";
import { fdStatusOptionsFromStrings } from "../lib/fdStatusOptions";

const TEST_STATUS = "__VerifyFdStatus__";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");

  await mongoose.connect(uri);
  const settings = await AppSettings.findOne({ organization: null }).lean();
  if (!settings) throw new Error("No platform AppSettings");

  const before = [...(settings.fdStatuses ?? [])];
  const withTest = before.includes(TEST_STATUS) ? before : [...before, TEST_STATUS];

  await AppSettings.findByIdAndUpdate(settings._id, { $set: { fdStatuses: withTest } });
  const saved = (await AppSettings.findById(settings._id).lean())?.fdStatuses ?? [];
  const persisted = saved.includes(TEST_STATUS);
  const options = fdStatusOptionsFromStrings(saved);
  const inPicker = options.some((o) => o.value === TEST_STATUS && o.label === TEST_STATUS);

  await AppSettings.findByIdAndUpdate(settings._id, {
    $set: { fdStatuses: before.filter((s) => s !== TEST_STATUS) },
  });
  const cleaned = (await AppSettings.findById(settings._id).lean())?.fdStatuses ?? [];
  const cleanupOk = !cleaned.includes(TEST_STATUS);

  console.log("Database:", mongoose.connection.db!.databaseName);
  console.log("1) FD status persisted:", persisted ? "PASS" : "FAIL");
  console.log("2) Picker options include status:", inPicker ? "PASS" : "FAIL");
  console.log("3) Cleanup:", cleanupOk ? "PASS" : "FAIL");

  await mongoose.disconnect();
  const ok = persisted && inPicker && cleanupOk;
  console.log("\nOverall:", ok ? "PASS" : "FAIL");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
