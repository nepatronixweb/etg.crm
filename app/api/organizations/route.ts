import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Organization from "@/models/Organization";
import Branch from "@/models/Branch";
import User from "@/models/User";
import Lead from "@/models/Lead";
import Student from "@/models/Student";
import Enquiry from "@/models/Enquiry";
import { auth } from "@/lib/auth";
import { ORG_PLANS, normalizeOrganizationPlan } from "@/lib/orgPlans";

/** Super admin: list organizations with branch and CRM usage stats. */
export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await connectDB();
    const orgs = await Organization.find().sort({ createdAt: -1 }).lean();

    const withCounts = await Promise.all(
      orgs.map(async (o) => {
        const branchIds = await Branch.find({ organization: o._id }).distinct("_id");
        const branchFilter = branchIds.length > 0 ? { branch: { $in: branchIds } } : { branch: { $in: [] } };
        const [branchCount, userCount, leadCount, studentCount, enquiryCount] = await Promise.all([
          branchIds.length,
          branchIds.length > 0 ? User.countDocuments(branchFilter) : 0,
          branchIds.length > 0 ? Lead.countDocuments(branchFilter) : 0,
          branchIds.length > 0 ? Student.countDocuments(branchFilter) : 0,
          branchIds.length > 0 ? Enquiry.countDocuments(branchFilter) : 0,
        ]);
        return {
          _id: o._id.toString(),
          name: o.name,
          subscriptionStatus: o.subscriptionStatus,
          plan: normalizeOrganizationPlan(o.plan),
          planLabel: ORG_PLANS[normalizeOrganizationPlan(o.plan)].label,
          trialEndsAt: o.trialEndsAt ? new Date(o.trialEndsAt).toISOString() : null,
          paidThrough: o.paidThrough ? new Date(o.paidThrough).toISOString() : null,
          billingNote: o.billingNote ?? "",
          branchCount,
          userCount,
          leadCount,
          studentCount,
          enquiryCount,
          createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : null,
        };
      })
    );

    const summary = {
      total: withCounts.length,
      trialing: withCounts.filter((r) => r.subscriptionStatus === "trialing").length,
      active: withCounts.filter((r) => r.subscriptionStatus === "active").length,
      expired: withCounts.filter((r) => r.subscriptionStatus === "expired").length,
      suspended: withCounts.filter((r) => r.subscriptionStatus === "suspended").length,
    };

    return NextResponse.json({ organizations: withCounts, summary });
  } catch {
    return NextResponse.json({ error: "Failed to list organizations" }, { status: 500 });
  }
}
