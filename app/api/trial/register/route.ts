import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Branch from "@/models/Branch";
import { checkRateLimit } from "@/lib/rateLimit";
import { createTrialOrganization } from "@/lib/ensureBranchOrganization";
import { ROLE_DEFAULT_PERMISSIONS } from "@/lib/utils";

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

function shouldSkipTrialRateLimit(): boolean {
  if (process.env.DISABLE_TRIAL_RATE_LIMIT === "true") return true;
  if (process.env.NODE_ENV === "development") return true;
  const base = process.env.NEXTAUTH_URL ?? "";
  return /localhost|127\.0\.0\.1/i.test(base);
}

/** Local standalone MongoDB has no replica set; transactions abort — fall back to sequential creates. */
function isTransactionUnsupportedError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /replica set|mongos|transaction.*not supported|Multi-document transactions/i.test(msg);
}

export async function POST(req: NextRequest) {
  try {
    if (!shouldSkipTrialRateLimit()) {
      const ip = clientIp(req);
      if (!(await checkRateLimit(`trial-register:${ip}`, 5, 3_600_000))) {
        return NextResponse.json(
          { error: "Too many trial signups from this network. Try again later." },
          { status: 429 }
        );
      }
    }

    const body = await req.json();
    const organizationName = typeof body.organizationName === "string" ? body.organizationName.trim() : "";
    const branchName = typeof body.branchName === "string" ? body.branchName.trim() : "";
    const branchLocation =
      typeof body.branchLocation === "string" && body.branchLocation.trim()
        ? body.branchLocation.trim()
        : "Main office";
    const adminName = typeof body.adminName === "string" ? body.adminName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!organizationName || organizationName.length > 200) {
      return NextResponse.json({ error: "Organization name is required (max 200 characters)." }, { status: 400 });
    }
    if (!branchName || branchName.length > 200) {
      return NextResponse.json({ error: "Branch name is required (max 200 characters)." }, { status: 400 });
    }
    if (!adminName || adminName.length > 120) {
      return NextResponse.json({ error: "Your name is required (max 120 characters)." }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    await connectDB();

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists. Sign in instead." }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const permissions = [...ROLE_DEFAULT_PERMISSIONS.org_admin];

    const createWorkspace = async (session?: mongoose.ClientSession) => {
      const org = await createTrialOrganization(organizationName, session ? { session } : undefined);
      const branchPayload = {
        name: branchName,
        location: branchLocation.slice(0, 500),
        organization: org._id,
        isActive: true,
      };
      const branch = session
        ? (await Branch.create([branchPayload], { session }))[0]
        : await Branch.create(branchPayload);
      const userPayload = {
        name: adminName,
        email,
        password: hashed,
        role: "org_admin" as const,
        permissions,
        branch: branch._id,
        isActive: true,
      };
      if (session) {
        await User.create([userPayload], { session });
      } else {
        await User.create(userPayload);
      }
    };

    if (process.env.DISABLE_TRIAL_SIGNUP_TRANSACTION === "true") {
      await createWorkspace();
    } else {
      const session = await mongoose.startSession();
      try {
        try {
          await session.withTransaction(async () => {
            await createWorkspace(session);
          });
        } catch (txnErr) {
          if (isTransactionUnsupportedError(txnErr)) {
            await createWorkspace();
          } else {
            throw txnErr;
          }
        }
      } finally {
        await session.endSession();
      }
    }

    return NextResponse.json({ ok: true, message: "Trial workspace created. You can sign in now." }, { status: 201 });
  } catch (e: unknown) {
    const code = typeof e === "object" && e !== null && "code" in e ? (e as { code: unknown }).code : undefined;
    if (code === 11000) {
      return NextResponse.json({ error: "An account with this email already exists. Sign in instead." }, { status: 409 });
    }
    console.error("[trial/register]", e);
    return NextResponse.json({ error: "Could not create trial account. Please try again." }, { status: 500 });
  }
}
