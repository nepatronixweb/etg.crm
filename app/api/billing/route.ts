import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { auth } from "@/lib/auth";
import { evaluateOrganizationAccess } from "@/lib/organizationAccess";
import Organization from "@/models/Organization";
import { getOrganizationPlanUsage } from "@/lib/orgPlanUsage";
import { ORG_PLANS, ORG_PLAN_IDS } from "@/lib/orgPlans";

export const dynamic = "force-dynamic";

/** Org billing snapshot: plan, usage vs limits, subscription status. */
export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (session.user.role === "super_admin") {
      return NextResponse.json({
        role: "super_admin",
        plans: ORG_PLAN_IDS.map((id) => ORG_PLANS[id]),
      });
    }

    const orgId = session.user.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: "No organization linked to this account." }, { status: 400 });
    }

    await connectDB();
    const org = await Organization.findById(orgId).lean();
    if (!org) return NextResponse.json({ error: "Organization not found." }, { status: 404 });

    const payload = await getOrganizationPlanUsage(orgId);
    if (!payload) return NextResponse.json({ error: "Organization not found." }, { status: 404 });

    payload.orgAccessAllowed = evaluateOrganizationAccess(org);
    payload.organizationName = session.user.organizationName ?? payload.organizationName;

    return NextResponse.json({
      ...payload,
      plans: ORG_PLAN_IDS.map((id) => ({
        id,
        label: ORG_PLANS[id].label,
        description: ORG_PLANS[id].description,
        maxUsers: ORG_PLANS[id].maxUsers,
        maxBranches: ORG_PLANS[id].maxBranches,
        maxLeads: ORG_PLANS[id].maxLeads,
      })),
      contactEmail: process.env.BILLING_CONTACT_EMAIL ?? "billing@educationtreeglobal.com",
    });
  } catch (err) {
    console.error("GET /api/billing", err);
    return NextResponse.json({ error: "Failed to load billing info" }, { status: 500 });
  }
}
