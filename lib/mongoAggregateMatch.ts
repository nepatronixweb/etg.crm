import mongoose from "mongoose";

/** 24-char hex ObjectId strings passed from sessions / query params */
const HEX24 = /^[a-f\d]{24}$/i;

/** Ref fields Mongoose casts for find/count but raw aggregate $match compares literaly. */
const OID_FIELDS = new Set(["branch", "counsellor", "lead", "enquiry", "student", "assignedTo", "user"]);

function castStringToObjectId(val: unknown): unknown {
  if (val instanceof mongoose.Types.ObjectId) return val;
  if (typeof val === "string" && HEX24.test(val)) {
    try {
      return new mongoose.Types.ObjectId(val);
    } catch {
      return val;
    }
  }
  return val;
}

function normalizeScalarOrRefVal(val: unknown): unknown {
  if (val == null || typeof val !== "object" || Array.isArray(val)) {
    return castStringToObjectId(val);
  }
  const vo = val as Record<string, unknown>;
  // { $in: [...] }, { $nin: [...] } may contain hex strings mixed with ObjectIds
  const out = { ...vo };
  if (Array.isArray(vo.$in)) {
    out.$in = (vo.$in as unknown[]).map((x) => castStringToObjectId(x));
  }
  if (Array.isArray(vo.$nin)) {
    out.$nin = (vo.$nin as unknown[]).map((x) => castStringToObjectId(x));
  }
  if ("$eq" in vo && typeof vo.$eq === "string") {
    out.$eq = castStringToObjectId(vo.$eq);
  }
  return out;
}

/**
 * Clone pipeline $match clauses so Mongo compares ObjectId fields the same way
 * mongoose find/count casts them (fixes empty aggregates while find returns rows).
 */
export function normalizeMatchIdsForAggregate(
  match: Record<string, unknown>,
): Record<string, unknown> {
  if (match == null || typeof match !== "object") return match;

  const m = match as Record<string, unknown>;

  for (const key of ["$and", "$or", "$nor"] as const) {
    const parts = m[key];
    if (Array.isArray(parts)) {
      return {
        ...m,
        [key]: parts.map((sub) =>
          sub && typeof sub === "object" && !Array.isArray(sub)
            ? normalizeMatchIdsForAggregate(sub as Record<string, unknown>)
            : sub,
        ),
      };
    }
  }

  const out: Record<string, unknown> = { ...m };
  for (const k of OID_FIELDS) {
    if (k in out) {
      const v = out[k];
      if (v instanceof mongoose.Types.ObjectId || typeof v === "string") {
        out[k] = castStringToObjectId(v);
      } else if (v && typeof v === "object" && !Array.isArray(v)) {
        out[k] = normalizeScalarOrRefVal(v);
      }
    }
  }
  return out;
}
