import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Organization from "@/models/Organization";
import Branch from "@/models/Branch";
import { auth } from "@/lib/auth";

/** Super admin: list organizations and branch counts (billing / subscription management). */
export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await connectDB();
    const orgs = await Organization.find().sort({ name: 1 }).lean();
    const withCounts = await Promise.all(
      orgs.map(async (o) => {
        const n = await Branch.countDocuments({ organization: o._id });
        return {
          _id: o._id.toString(),
          name: o.name,
          subscriptionStatus: o.subscriptionStatus,
          trialEndsAt: o.trialEndsAt ? new Date(o.trialEndsAt).toISOString() : null,
          paidThrough: o.paidThrough ? new Date(o.paidThrough).toISOString() : null,
          billingNote: o.billingNote ?? "",
          branchCount: n,
          createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : null,
        };
      })
    );
    return NextResponse.json(withCounts);
  } catch {
    return NextResponse.json({ error: "Failed to list organizations" }, { status: 500 });
  }
}
