import type mongoose from "mongoose";

/** Minimum digit length to treat a phone as a duplicate key within a branch. */
export const MIN_LEAD_PHONE_DIGITS = 7;

const STATUS_RANK: Record<string, number> = {
  "registered/completed": 100,
  registered: 100,
  "qualified lead": 90,
  counselled: 80,
  counselling: 70,
  "phone counselling": 65,
  assigned: 60,
  "in-progress": 40,
  "ap-pending": 35,
  interested: 25,
  "ap-interested": 25,
  "fd-interested": 25,
  "open/unassigned": 10,
};

export function normalizeLeadPhone(phone: string): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

export function leadDuplicateGroupKey(branch: unknown, phone: string): string {
  const norm = normalizeLeadPhone(phone);
  const branchKey = branch ? String(branch) : "";
  if (norm.length >= MIN_LEAD_PHONE_DIGITS) return `${branchKey}::${norm}`;
  return "";
}

type LeadLike = {
  _id?: unknown;
  branch?: unknown;
  phone?: string;
  status?: string;
  convertedToStudent?: boolean;
  updatedAt?: Date | string;
  createdAt?: Date | string;
};

export function leadProgressScore(lead: LeadLike): number {
  let score = 0;
  if (lead.convertedToStudent) score += 1000;
  const status = String(lead.status ?? "")
    .trim()
    .toLowerCase();
  score += STATUS_RANK[status] ?? 30;
  const t = new Date(lead.updatedAt ?? lead.createdAt ?? 0).getTime();
  if (Number.isFinite(t)) score += t / 1e15;
  return score;
}

export function pickPreferredLead<T extends LeadLike>(a: T, b: T): T {
  return leadProgressScore(a) >= leadProgressScore(b) ? a : b;
}

/** In-memory dedupe — keeps the most progressed record per branch+phone. */
export function dedupeLeadRecords<T extends LeadLike>(records: T[]): T[] {
  const out = new Map<string, T>();
  const order: string[] = [];
  for (const rec of records) {
    const key = leadDuplicateGroupKey(rec.branch, rec.phone || "") || `id:${String(rec._id)}`;
    const existing = out.get(key);
    if (!existing) {
      out.set(key, rec);
      order.push(key);
    } else {
      out.set(key, pickPreferredLead(existing, rec));
    }
  }
  return order.map((k) => out.get(k)!);
}

function statusRankSwitchBranches() {
  return Object.entries(STATUS_RANK).map(([value, rank]) => ({
    case: { $eq: [{ $toLower: { $trim: { input: { $ifNull: ["$status", ""] } } } }, value] },
    then: rank,
  }));
}

/** Aggregation stages: one canonical lead per branch+phone (most progressed wins). Requires phoneNormalized on documents. */
export function leadDedupAggregateStages(opts?: { searchTrimmed?: string }): mongoose.PipelineStage[] {
  const escaped = (opts?.searchTrimmed ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stages: mongoose.PipelineStage[] = [
    {
      $addFields: {
        _duplicateScore: {
          $add: [
            { $cond: ["$convertedToStudent", 1000, 0] },
            {
              $switch: {
                branches: statusRankSwitchBranches(),
                default: 30,
              },
            },
            {
              $divide: [{ $toLong: { $ifNull: ["$updatedAt", "$createdAt"] } }, 1e10],
            },
          ],
        },
        _dedupeKey: {
          $cond: [
            { $gte: [{ $strLenCP: { $ifNull: ["$phoneNormalized", ""] } }, MIN_LEAD_PHONE_DIGITS] },
            { $concat: [{ $toString: "$branch" }, "::", "$phoneNormalized"] },
            { $toString: "$_id" },
          ],
        },
      },
    },
  ];

  if (escaped) {
    stages.push({
      $addFields: {
        _nameSearchRank: {
          $cond: [
            {
              $regexMatch: {
                input: { $toString: { $ifNull: ["$name", ""] } },
                regex: escaped,
                options: "i",
              },
            },
            1,
            0,
          ],
        },
      },
    });
    stages.push({ $sort: { _nameSearchRank: -1, _duplicateScore: -1, createdAt: -1 } });
  } else {
    stages.push({ $sort: { _duplicateScore: -1, createdAt: -1 } });
  }

  stages.push(
    { $group: { _id: "$_dedupeKey", doc: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$doc" } }
  );

  if (escaped) {
    stages.push({ $sort: { _nameSearchRank: -1, createdAt: -1 } });
  } else {
    stages.push({ $sort: { createdAt: -1 } });
  }

  return stages;
}

export function stripLeadDedupInternals<T extends Record<string, unknown>>(doc: T): T {
  const {
    phoneNormalized: _pn,
    _duplicateScore: _ds,
    _dedupeKey: _dk,
    _nameSearchRank: _nr,
    ...rest
  } = doc;
  return rest as T;
}

export function buildLeadDuplicateQuery(
  branch: string | mongoose.Types.ObjectId,
  phone: string,
  excludeId?: string
): Record<string, unknown> | null {
  const phoneNormalized = normalizeLeadPhone(phone);
  if (phoneNormalized.length < MIN_LEAD_PHONE_DIGITS) return null;

  const esc = phoneNormalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const query: Record<string, unknown> = {
    branch,
    $or: [{ phoneNormalized }, { phone: { $regex: new RegExp(`${esc}$`) } }],
  };
  if (excludeId) query._id = { $ne: excludeId };
  return query;
}
