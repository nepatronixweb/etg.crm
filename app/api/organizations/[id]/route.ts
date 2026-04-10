import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Organization from "@/models/Organization";
import ActivityLog from "@/models/ActivityLog";
import { auth } from "@/lib/auth";

const STATUSES = ["trialing", "active", "expired", "suspended"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();
    const {
      name,
      subscriptionStatus,
      paidThrough,
      trialEndsAt,
      billingNote,
    } = body as {
      name?: string;
      subscriptionStatus?: string;
      paidThrough?: string | null;
      trialEndsAt?: string | null;
      billingNote?: string;
    };

    await connectDB();
    const org = await Organization.findById(id);
    if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (typeof name === "string" && name.trim()) {
      org.name = name.trim();
    }
    if (typeof subscriptionStatus === "string" && STATUSES.includes(subscriptionStatus as (typeof STATUSES)[number])) {
      org.subscriptionStatus = subscriptionStatus as (typeof STATUSES)[number];
    }
    if (paidThrough === null) {
      org.paidThrough = undefined;
    } else if (typeof paidThrough === "string" && paidThrough.trim()) {
      const d = new Date(paidThrough);
      if (!Number.isNaN(d.getTime())) org.paidThrough = d;
    }
    if (trialEndsAt === null) {
      org.trialEndsAt = undefined;
    } else if (typeof trialEndsAt === "string" && trialEndsAt.trim()) {
      const d = new Date(trialEndsAt);
      if (!Number.isNaN(d.getTime())) org.trialEndsAt = d;
    }
    if (typeof billingNote === "string") {
      org.billingNote = billingNote.slice(0, 2000);
    }

    await org.save();

    await ActivityLog.create({
      user: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "UPDATE",
      module: "Organizations",
      targetId: org._id.toString(),
      targetName: org.name,
      details: `Updated subscription: ${org.subscriptionStatus}`,
    });

    return NextResponse.json({
      organization: {
        _id: org._id.toString(),
        name: org.name,
        subscriptionStatus: org.subscriptionStatus,
        trialEndsAt: org.trialEndsAt ? org.trialEndsAt.toISOString() : null,
        paidThrough: org.paidThrough ? org.paidThrough.toISOString() : null,
        billingNote: org.billingNote ?? "",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to update organization" }, { status: 500 });
  }
}
