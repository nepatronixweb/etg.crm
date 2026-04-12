import mongoose from "mongoose";
import type { Session } from "next-auth";
import { parseCreatedAtDateOnlyBound } from "@/lib/dateTimeRangeFilterDefaults";
import { mergeTelecallerFreshLeadFilter, TELECALLER_FRESH_BUCKET } from "@/lib/telecallerFreshLeads";
import {
  isTelecallerOverviewDashboardBucket,
  mergeTelecallerOverviewBucketFilter,
} from "@/lib/telecallerLeadOverviewBuckets";

/** Omit one dimension when computing distinct values for that facet (cascading filter options). */
export type LeadFacetKey =
  | "standing"
  | "source"
  | "country"
  | "assignedTo"
  | "fdStatus"
  | "service"
  | "stage"
  | "academicYear"
  | "applyLevel"
  | "search";

/** ?from / ?to - datetime-local / ISO, or legacy YYYY-MM-DD (1:00 / 23:00 local, same as filter UI). */
export function parseLeadCreatedAtBound(raw: string, bound: "from" | "to"): Date {
  const s = raw.trim();
  if (!s) return new Date(NaN);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return parseCreatedAtDateOnlyBound(s, bound);
  }
  return new Date(s);
}

const LEAD_MATCH_OBJECT_ID_KEYS = new Set(["branch", "assignedTo", "assignedBy"]);

export function castObjectIdsForAggregateMatch(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (LEAD_MATCH_OBJECT_ID_KEYS.has(key) && typeof val === "string" && mongoose.Types.ObjectId.isValid(val)) {
      out[key] = new mongoose.Types.ObjectId(val);
    } else if ((key === "$and" || key === "$or") && Array.isArray(val)) {
      out[key] = val.map((item) =>
        item && typeof item === "object" && !Array.isArray(item) && !(item instanceof Date)
          ? castObjectIdsForAggregateMatch(item as Record<string, unknown>)
          : item
      );
    } else {
      out[key] = val;
    }
  }
  return out;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function attachCountryClause(filter: Record<string, unknown>, countryTrimmed: string): void {
  const esc = escapeRegex(countryTrimmed);
  const countryBlock = {
    $or: [
      { interestedCountry: { $regex: new RegExp(`^${esc}$`, "i") } },
      { "interestedCountries.country": { $regex: new RegExp(`^${esc}$`, "i") } },
    ],
  };
  const andArr = filter.$and;
  if (Array.isArray(andArr)) {
    andArr.push(countryBlock);
    return;
  }
  filter.$and = [countryBlock];
}

/**
 * Same match semantics as GET /api/leads — used for list + filter-meta facets.
 */
export function buildLeadListFilter(
  session: Session,
  searchParams: URLSearchParams,
  options?: { omitFacet?: LeadFacetKey }
): {
  filter: Record<string, unknown>;
  bucketParam: string | null;
  searchTrimmed: string;
  searchOrClause: Array<Record<string, unknown>> | undefined;
} {
  const omit = options?.omitFacet;

  const branch = searchParams.get("branch");
  const standing = searchParams.get("standing");
  const source = searchParams.get("source");
  const assignedTo = searchParams.get("assignedTo");
  const countryRaw = searchParams.get("country");
  const fdStatus = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const service = searchParams.get("service");
  const stage = searchParams.get("stage");
  const academicYear = searchParams.get("academicYear");
  const applyLevel = searchParams.get("applyLevel");
  const search = searchParams.get("search");
  const bucketParamRaw = searchParams.get("bucket");
  const bucketParam = bucketParamRaw?.trim() || null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};

  const role = session.user.role;
  if (role === "counsellor") filter.assignedTo = session.user.id;
  else if (role === "telecaller") filter.source = { $ne: "walk_in" };
  else if (role === "front_desk") {
    filter.branch = session.user.branch;
  } else if (role !== "super_admin") {
    filter.branch = session.user.branch;
  }

  if (branch) filter.branch = branch;
  if (standing && omit !== "standing") filter.standing = standing;
  if (source && omit !== "source") filter.source = source;
  if (assignedTo && omit !== "assignedTo") filter.assignedTo = assignedTo;
  if (fdStatus && omit !== "fdStatus") filter.status = fdStatus;

  if (from || to) {
    const createdRange: { $gte?: Date; $lte?: Date } = {};
    if (from) {
      const d = parseLeadCreatedAtBound(from, "from");
      if (!Number.isNaN(d.getTime())) createdRange.$gte = d;
    }
    if (to) {
      const d = parseLeadCreatedAtBound(to, "to");
      if (!Number.isNaN(d.getTime())) createdRange.$lte = d;
    }
    if (Object.keys(createdRange).length > 0) filter.createdAt = createdRange;
  }

  if (service?.trim() && omit !== "service") {
    const esc = escapeRegex(service.trim());
    filter.interestedService = { $regex: new RegExp(`^${esc}$`, "i") };
  }
  if (stage && omit !== "stage") filter.stage = stage;
  if (academicYear && omit !== "academicYear") filter.academicYear = academicYear;
  if (applyLevel?.trim() && omit !== "applyLevel") {
    const esc = escapeRegex(applyLevel.trim());
    filter.applyLevel = { $regex: new RegExp(`^${esc}$`, "i") };
  }

  const searchTrimmed = (search ?? "").trim();
  let searchOrClause: Array<Record<string, unknown>> | undefined;

  if (searchTrimmed && omit !== "search") {
    const escaped = escapeRegex(searchTrimmed);
    const rx = { $regex: escaped, $options: "i" };
    searchOrClause = [
      { name: rx },
      { phone: rx },
      { email: rx },
      { interestedCountry: rx },
      { course: rx },
      { comments: rx },
      { parentName: rx },
      { senderName: rx },
      { academicInstitution: rx },
      {
        interestedCountries: {
          $elemMatch: {
            $or: [{ country: rx }, { universityName: rx }],
          },
        },
      },
    ];
    const bucketNeedsAndSearch =
      bucketParam === TELECALLER_FRESH_BUCKET || isTelecallerOverviewDashboardBucket(bucketParam);
    if (!bucketNeedsAndSearch) {
      filter.$or = searchOrClause;
    }
  }

  if (bucketParam === TELECALLER_FRESH_BUCKET) {
    mergeTelecallerFreshLeadFilter(filter, searchOrClause);
  } else if (bucketParam && isTelecallerOverviewDashboardBucket(bucketParam)) {
    mergeTelecallerOverviewBucketFilter(filter, bucketParam, searchOrClause);
  }

  const countryTrimmed = (countryRaw ?? "").trim();
  if (countryTrimmed && omit !== "country") {
    attachCountryClause(filter, countryTrimmed);
  }

  return { filter, bucketParam, searchTrimmed, searchOrClause };
}
