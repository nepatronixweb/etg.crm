/**
 * Verify strict country filtering for leads/enquiries lists.
 * Usage: npx tsx scripts/verify-lead-country-filter.ts
 *        npx tsx --env-file=.env.local scripts/verify-lead-country-filter.ts
 */
import mongoose from "mongoose";
import Lead from "../models/Lead";
import { attachCountryClause } from "../lib/buildLeadListFilter";
import { resolveLeadCountryForDisplay } from "../lib/leadCountryDisplay";

type Sample = {
  label: string;
  interestedCountry: string;
  interestedCountries: { country: string }[];
  expectUK: boolean;
};

const SAMPLES: Sample[] = [
  {
    label: "legacy UK only",
    interestedCountry: "United Kingdom",
    interestedCountries: [],
    expectUK: true,
  },
  {
    label: "array Finland only",
    interestedCountry: "",
    interestedCountries: [{ country: "Finland" }],
    expectUK: false,
  },
  {
    label: "stale UK legacy + Finland array (must NOT match UK)",
    interestedCountry: "United Kingdom",
    interestedCountries: [{ country: "Finland" }],
    expectUK: false,
  },
  {
    label: "multi Finland + UK",
    interestedCountry: "",
    interestedCountries: [{ country: "Finland" }, { country: "United Kingdom" }],
    expectUK: true,
  },
  {
    label: "array UK only",
    interestedCountry: "",
    interestedCountries: [{ country: "United Kingdom" }],
    expectUK: true,
  },
];

/** Mirrors buildLeadCountryMatchClause semantics for offline checks. */
function leadMatchesCountry(
  lead: { interestedCountry?: string; interestedCountries?: { country?: string }[] },
  country: string
): boolean {
  const rx = new RegExp(`^${country.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  const entries = (lead.interestedCountries ?? []).filter((e) => e.country?.trim());
  if (entries.length > 0) {
    return entries.some((e) => rx.test(e.country!.trim()));
  }
  return rx.test(String(lead.interestedCountry ?? "").trim());
}

function assertCheck(label: string, ok: boolean, detail: string) {
  console.log(`${ok ? "PASS" : "FAIL"} | ${label}: ${detail}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  console.log("=== Lead country filter verification ===\n");

  for (const sample of SAMPLES) {
    const hit = leadMatchesCountry(sample, "United Kingdom");
    assertCheck(sample.label, hit === sample.expectUK, `expected UK=${sample.expectUK}, got ${hit}`);
  }

  const displayLead = {
    interestedCountry: "United Kingdom",
    interestedCountries: [{ country: "Finland" }, { country: "United Kingdom" }],
  };
  const shown = resolveLeadCountryForDisplay(displayLead, "United Kingdom");
  assertCheck(
    "display with UK filter on multi-country lead",
    shown === "United Kingdom",
    `shown="${shown}"`
  );

  const noFilterDisplay = resolveLeadCountryForDisplay({
    interestedCountry: "United Kingdom",
    interestedCountries: [{ country: "Finland" }],
  });
  assertCheck(
    "display without filter prefers interestedCountries array",
    noFilterDisplay === "Finland",
    `shown="${noFilterDisplay}"`
  );

  const uri = process.env.MONGODB_URI;
  if (uri) {
    console.log("\n--- Live DB spot-check (United Kingdom filter) ---");
    await mongoose.connect(uri);
    const liveFilter: Record<string, unknown> = {};
    attachCountryClause(liveFilter, "United Kingdom");
    const leads = await Lead.find(liveFilter)
      .select("interestedCountry interestedCountries name")
      .limit(300)
      .lean();
    let mismatches = 0;
    for (const lead of leads) {
      if (!leadMatchesCountry(lead, "United Kingdom")) {
        mismatches++;
        console.log(
          `FAIL | live lead "${lead.name}" missing UK:`,
          JSON.stringify({
            interestedCountry: lead.interestedCountry,
            interestedCountries: lead.interestedCountries,
          })
        );
      }
    }
    assertCheck(
      "live leads respect UK filter",
      mismatches === 0,
      `${leads.length} checked, ${mismatches} mismatches`
    );
    await mongoose.disconnect();
  } else {
    console.log("\n(skip live DB check — MONGODB_URI not set)");
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
