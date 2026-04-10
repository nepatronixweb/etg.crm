import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Lead from "@/models/Lead";
import { auth } from "@/lib/auth";
import {
  buildLeadListFilter,
  castObjectIdsForAggregateMatch,
  type LeadFacetKey,
} from "@/lib/buildLeadListFilter";

export const dynamic = "force-dynamic";

const FACET_KEYS: LeadFacetKey[] = [
  "standing",
  "source",
  "country",
  "assignedTo",
  "fdStatus",
  "service",
  "stage",
  "academicYear",
  "applyLevel",
];

function matchStageForFacet(session: NonNullable<Awaited<ReturnType<typeof auth>>>, sp: URLSearchParams, omit: LeadFacetKey) {
  const { filter } = buildLeadListFilter(session, sp, { omitFacet: omit });
  return { $match: castObjectIdsForAggregateMatch(filter as Record<string, unknown>) as Record<string, unknown> };
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const { searchParams } = new URL(req.url);

    const facetSpec: Record<string, mongoose.PipelineStage[]> = {};

    for (const key of FACET_KEYS) {
      const m = matchStageForFacet(session, searchParams, key);
      switch (key) {
        case "standing":
          facetSpec.standings = [
            m,
            { $group: { _id: "$standing" } },
            { $match: { _id: { $nin: [null, ""] } } },
            { $sort: { _id: 1 } },
          ];
          break;
        case "source":
          facetSpec.sources = [
            m,
            { $group: { _id: "$source" } },
            { $match: { _id: { $nin: [null, ""] } } },
            { $sort: { _id: 1 } },
          ];
          break;
        case "service":
          facetSpec.services = [
            m,
            { $group: { _id: "$interestedService" } },
            { $match: { _id: { $nin: [null, ""] } } },
            { $sort: { _id: 1 } },
          ];
          break;
        case "stage":
          facetSpec.stages = [
            m,
            { $group: { _id: "$stage" } },
            { $match: { _id: { $nin: [null, ""] } } },
            { $sort: { _id: 1 } },
          ];
          break;
        case "academicYear":
          facetSpec.academicYears = [
            m,
            { $group: { _id: "$academicYear" } },
            { $match: { _id: { $nin: [null, ""] } } },
            { $sort: { _id: -1 } },
          ];
          break;
        case "applyLevel":
          facetSpec.applyLevels = [
            m,
            { $group: { _id: "$applyLevel" } },
            { $match: { _id: { $nin: [null, ""] } } },
            { $sort: { _id: 1 } },
          ];
          break;
        case "fdStatus":
          facetSpec.fdStatuses = [
            m,
            { $group: { _id: "$status" } },
            { $match: { _id: { $nin: [null, ""] } } },
            { $sort: { _id: 1 } },
          ];
          break;
        case "assignedTo":
          facetSpec.assignedToIds = [
            m,
            { $match: { assignedTo: { $exists: true, $ne: null } } },
            { $group: { _id: "$assignedTo" } },
            { $sort: { _id: 1 } },
          ];
          break;
        case "country":
          facetSpec.countries = [
            m,
            {
              $project: {
                parts: {
                  $concatArrays: [
                    {
                      $cond: [
                        {
                          $gt: [
                            { $strLenCP: { $trim: { input: { $ifNull: ["$interestedCountry", ""] } } } },
                            0,
                          ],
                        },
                        ["$interestedCountry"],
                        [],
                      ],
                    },
                    {
                      $map: {
                        input: { $ifNull: ["$interestedCountries", []] },
                        as: "ic",
                        in: "$$ic.country",
                      },
                    },
                  ],
                },
              },
            },
            { $unwind: "$parts" },
            {
              $match: {
                $expr: {
                  $gt: [{ $strLenCP: { $trim: { input: { $toString: "$parts" } } } }, 0],
                },
              },
            },
            {
              $group: {
                _id: { $toLower: { $trim: { input: { $toString: "$parts" } } } },
                display: { $first: { $trim: { input: { $toString: "$parts" } } } },
              },
            },
            { $sort: { display: 1 } },
          ];
          break;
        default:
          break;
      }
    }

    const [row] = await Lead.aggregate([{ $facet: facetSpec }] as mongoose.PipelineStage[]);
    const out = {
      standings: (row?.standings ?? []).map((x: { _id: string }) => x._id).filter(Boolean),
      sources: (row?.sources ?? []).map((x: { _id: string }) => x._id).filter(Boolean),
      services: (row?.services ?? []).map((x: { _id: string }) => x._id).filter(Boolean),
      stages: (row?.stages ?? []).map((x: { _id: string }) => x._id).filter(Boolean),
      academicYears: (row?.academicYears ?? []).map((x: { _id: string }) => x._id).filter(Boolean),
      applyLevels: (row?.applyLevels ?? []).map((x: { _id: string }) => x._id).filter(Boolean),
      fdStatuses: (row?.fdStatuses ?? []).map((x: { _id: string }) => x._id).filter(Boolean),
      assignedToIds: (row?.assignedToIds ?? []).map((x: { _id: mongoose.Types.ObjectId }) => String(x._id)),
      countries: (row?.countries ?? []).map((x: { display: string }) => x.display).filter(Boolean),
    };

    return NextResponse.json(out);
  } catch (e) {
    console.error("GET /api/leads/filter-meta", e);
    return NextResponse.json({ error: "Failed to load filter options" }, { status: 500 });
  }
}
