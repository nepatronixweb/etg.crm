/**
 * Migration: Rename GTE → GS
 * 
 * Updates:
 *   1. All Lead documents: stage field gte_* → gs_*, stageDates keys gte_* → gs_*
 *   2. All Student documents: stage field gte_* → gs_*, stageDates keys gte_* → gs_*
 *   3. AppSettings: leadStageGroups "GTE" → "GS", leadStages group/label/value gte_* → gs_*
 *
 * Usage:
 *   npx ts-node -r dotenv/config scripts/migrate-gte-to-gs.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI is not set. Add it to .env.local first.");
  process.exit(1);
}

const STAGE_MAP: Record<string, string> = {
  gte_applied: "gs_applied",
  gte_additional_doc_requested: "gs_additional_doc_requested",
  gte_additional_doc_sent: "gs_additional_doc_sent",
  gte_approved: "gs_approved",
  gte_rejected: "gs_rejected",
};

async function migrate() {
  await mongoose.connect(MONGODB_URI as string);
  console.log("✅  Connected to MongoDB");

  const db = mongoose.connection.db;
  if (!db) { console.error("DB not available"); process.exit(1); }

  // 1. Update Lead documents
  const leadsCol = db.collection("leads");
  for (const [oldStage, newStage] of Object.entries(STAGE_MAP)) {
    const result = await leadsCol.updateMany(
      { stage: oldStage },
      [
        {
          $set: {
            stage: newStage,
            [`stageDates.${newStage}`]: `$stageDates.${oldStage}`,
          },
        },
        { $unset: [`stageDates.${oldStage}`] },
      ]
    );
    if (result.modifiedCount > 0) {
      console.log(`  Leads: ${oldStage} → ${newStage}  (${result.modifiedCount} updated)`);
    }
  }

  // 2. Update Student documents
  const studentsCol = db.collection("students");
  for (const [oldStage, newStage] of Object.entries(STAGE_MAP)) {
    const result = await studentsCol.updateMany(
      { stage: oldStage },
      [
        {
          $set: {
            stage: newStage,
            [`stageDates.${newStage}`]: `$stageDates.${oldStage}`,
          },
        },
        { $unset: [`stageDates.${oldStage}`] },
      ]
    );
    if (result.modifiedCount > 0) {
      console.log(`  Students: ${oldStage} → ${newStage}  (${result.modifiedCount} updated)`);
    }
  }

  // 3. Update AppSettings
  const settingsCol = db.collection("appsettings");

  // Rename group "GTE" → "GS"
  await settingsCol.updateMany(
    { leadStageGroups: "GTE" },
    { $set: { "leadStageGroups.$[elem]": "GS" } },
    { arrayFilters: [{ elem: "GTE" }] }
  );

  // Rename leadStages entries
  for (const [oldVal, newVal] of Object.entries(STAGE_MAP)) {
    const newLabel = newVal
      .split("_")
      .map((w) => w === "gs" ? "GS" : w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    await settingsCol.updateMany(
      { "leadStages.value": oldVal },
      {
        $set: {
          "leadStages.$[elem].value": newVal,
          "leadStages.$[elem].label": newLabel,
          "leadStages.$[elem].group": "GS",
        },
      },
      { arrayFilters: [{ "elem.value": oldVal }] }
    );
  }

  console.log("✅  AppSettings updated (GTE → GS)");
  console.log("\n✅  Migration complete!");
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("❌  Migration failed:", err);
  process.exit(1);
});
