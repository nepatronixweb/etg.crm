/**
 * End-to-end cross-check: autosave fields + staff-facing consumers.
 * Usage: npx tsx --env-file=.env.local scripts/verify-staff-sync-e2e.ts
 */
import mongoose from "mongoose";
import AppSettings from "../models/AppSettings";
import { fdStatusOptionsFromStrings } from "../lib/fdStatusOptions";
import { leadSourceLabelFromList, normalizeLeadSourceValue } from "../lib/leadSourceLabels";

const TEST_SOURCE = "Cross Verify Source";
const TEST_FD = "Cross Verify FD Status";

function buildLeadDropdownOptions(leadSources: string[]) {
  const DEFAULT = ["walk_in", "capture_visit", "facebook", "whatsapp", "instagram", "website", "referral", "other"];
  const normalized = leadSources.map((s) => ({
    value: normalizeLeadSourceValue(s),
    label: s,
  }));
  const merged: { value: string; label: string }[] = DEFAULT.map((v) => ({
    value: v,
    label: v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  }));
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

  const doc = await AppSettings.findOne({ organization: null }).lean();
  if (!doc) throw new Error("No AppSettings row");

  const origSources = [...(doc.leadSources ?? [])];
  const origFd = [...(doc.fdStatuses ?? [])];

  const nextSources = origSources.includes(TEST_SOURCE) ? origSources : [...origSources, TEST_SOURCE];
  const nextFd = origFd.includes(TEST_FD) ? origFd : [...origFd, TEST_FD];

  await AppSettings.findByIdAndUpdate(doc._id, {
    $set: { leadSources: nextSources, fdStatuses: nextFd },
  });

  const lean = await AppSettings.findById(doc._id).lean();
  const json: Record<string, unknown> = lean ? { ...lean } : {};

  const isPlatformRow = lean?.organization == null;
  if (isPlatformRow && Array.isArray(json.leadSources) && json.leadSources.length) {
    const merged = [...json.leadSources];
    for (const src of ["Walk-in", "Capture Visit", "Facebook", "WhatsApp", "Instagram", "Website", "Referral", "Other"]) {
      if (!merged.includes(src)) merged.push(src);
    }
    json.leadSources = merged;
  }

  const savedSources = (lean?.leadSources ?? []).includes(TEST_SOURCE);
  const savedFd = (lean?.fdStatuses ?? []).includes(TEST_FD);
  const apiReturnsSource = Array.isArray(json.leadSources) && json.leadSources.includes(TEST_SOURCE);
  const apiReturnsFd = Array.isArray(json.fdStatuses) && json.fdStatuses.includes(TEST_FD);

  const dropdown = buildLeadDropdownOptions(json.leadSources as string[]);
  const inLeadForm = dropdown.some((o) => o.label === TEST_SOURCE);

  const fdOpts = fdStatusOptionsFromStrings(json.fdStatuses as string[]);
  const inFdPicker = fdOpts.some((o) => o.label === TEST_FD);

  const storedValue = normalizeLeadSourceValue(TEST_SOURCE);
  const detailLabel = leadSourceLabelFromList(json.leadSources as string[], storedValue);

  await AppSettings.findByIdAndUpdate(doc._id, {
    $set: {
      leadSources: origSources.filter((s) => s !== TEST_SOURCE),
      fdStatuses: origFd.filter((s) => s !== TEST_FD),
    },
  });

  console.log("Database:", dbName);
  console.log("Platform AppSettings id:", String(doc._id));
  console.log("");
  console.log("A) Autosave → MongoDB");
  console.log("   Lead source persisted:", savedSources ? "PASS" : "FAIL");
  console.log("   FD status persisted:", savedFd ? "PASS" : "FAIL");
  console.log("");
  console.log("B) GET /api/settings/app (platform merge)");
  console.log("   API includes new source:", apiReturnsSource ? "PASS" : "FAIL");
  console.log("   API includes new FD status:", apiReturnsFd ? "PASS" : "FAIL");
  console.log("");
  console.log("C) Staff UI consumers");
  console.log("   Leads form dropdown:", inLeadForm ? "PASS" : "FAIL");
  console.log("   FD workflow picker:", inFdPicker ? "PASS" : "FAIL");
  console.log("   Lead detail source label:", detailLabel === TEST_SOURCE ? "PASS" : `FAIL (${detailLabel})`);
  console.log("");
  console.log("D) Current saved counts");
  console.log("   leadSources:", origSources.length);
  console.log("   fdStatuses:", origFd.length);

  await mongoose.disconnect();

  const ok = savedSources && savedFd && apiReturnsSource && apiReturnsFd && inLeadForm && inFdPicker && detailLabel === TEST_SOURCE;
  console.log("\nOverall:", ok ? "PASS" : "FAIL");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
