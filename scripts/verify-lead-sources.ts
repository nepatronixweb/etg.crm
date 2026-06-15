/**
 * Cross-verify lead source persistence + leads dropdown mapping.
 * Usage: npx tsx --env-file=.env.local scripts/verify-lead-sources.ts
 */
import mongoose from "mongoose";
import AppSettings from "../models/AppSettings";

const DEFAULT_SOURCES = [
  { value: "walk_in", label: "Walk-in" },
  { value: "capture_visit", label: "Capture Visit" },
  { value: "facebook", label: "Facebook" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "other", label: "Other" },
];

const TEST_LABEL = "__VerifyTestSource__";

function normalizeLabel(label: string) {
  return label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

function buildDropdownOptions(leadSources: string[]) {
  const normalized = leadSources.map((s) => ({
    value: normalizeLabel(s),
    label: s,
  }));
  const merged = [...DEFAULT_SOURCES];
  for (const src of normalized) {
    if (!merged.some((m) => m.value === src.value)) merged.push(src);
  }
  return merged;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");

  await mongoose.connect(uri);
  const dbName = mongoose.connection.db!.databaseName;
  console.log("Database:", dbName);

  const settings = await AppSettings.findOne({ organization: null }).lean();
  if (!settings) throw new Error("No platform AppSettings row found");

  const before = [...(settings.leadSources ?? [])];
  console.log("\n1) Before count:", before.length);

  const withTest = before.includes(TEST_LABEL) ? before : [...before, TEST_LABEL];
  await AppSettings.findByIdAndUpdate(settings._id, { $set: { leadSources: withTest } });

  const afterSave = await AppSettings.findById(settings._id).lean();
  const saved = afterSave?.leadSources ?? [];
  const persisted = saved.includes(TEST_LABEL);
  console.log("2) PUT-style save persisted test source:", persisted ? "PASS" : "FAIL");

  const dropdown = buildDropdownOptions(saved);
  const testValue = normalizeLabel(TEST_LABEL);
  const inDropdown = dropdown.some((o) => o.value === testValue && o.label === TEST_LABEL);
  console.log("3) Leads dropdown mapping includes test source:", inDropdown ? "PASS" : "FAIL");
  console.log("   mapped value:", testValue);

  const clientSources = ["Sub Agent", "UK NZ ADMISSIONS DAY 2026", "Capture Visit"];
  for (const label of clientSources) {
    const value = normalizeLabel(label);
    const opts = buildDropdownOptions([...saved, label]);
    const ok = opts.some((o) => o.label === label);
    console.log(`4) Client source "${label}" -> "${value}":`, ok ? "PASS" : "FAIL");
  }

  const restored = before.filter((s) => s !== TEST_LABEL);
  await AppSettings.findByIdAndUpdate(settings._id, { $set: { leadSources: restored } });
  const cleaned = await AppSettings.findById(settings._id).lean();
  const cleanupOk = !(cleaned?.leadSources ?? []).includes(TEST_LABEL);
  console.log("\n5) Cleanup removed test source:", cleanupOk ? "PASS" : "FAIL");

  await mongoose.disconnect();

  const allPass = persisted && inDropdown && cleanupOk;
  console.log("\n" + (allPass ? "Overall: PASS" : "Overall: FAIL"));
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
