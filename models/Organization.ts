import mongoose, { Document, Schema } from "mongoose";

export type OrganizationSubscriptionStatus =
  | "trialing"
  | "active"
  | "expired"
  | "suspended";

export type OrganizationPlan = "trial" | "starter" | "pro" | "enterprise";

export interface IOrganizationDocument extends Document {
  name: string;
  subscriptionStatus: OrganizationSubscriptionStatus;
  /** Billing plan — controls user/branch/lead limits. */
  plan: OrganizationPlan;
  /** When trial ends (set for new orgs; optional after conversion to active). */
  trialEndsAt?: Date;
  /** Optional prepaid access end (manual billing). Access allowed while now < paidWhen set. */
  paidThrough?: Date;
  billingNote?: string;
  /** Set when org admin finishes first-run setup wizard. */
  onboardingCompletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganizationDocument>(
  {
    name: { type: String, required: true, trim: true },
    subscriptionStatus: {
      type: String,
      enum: ["trialing", "active", "expired", "suspended"],
      default: "trialing",
    },
    plan: {
      type: String,
      enum: ["trial", "starter", "pro", "enterprise"],
      default: "trial",
    },
    trialEndsAt: { type: Date },
    paidThrough: { type: Date },
    billingNote: { type: String, default: "", trim: true, maxlength: 2000 },
    onboardingCompletedAt: { type: Date },
  },
  { timestamps: true }
);

OrganizationSchema.index({ subscriptionStatus: 1 });

export default mongoose.models.Organization ||
  mongoose.model<IOrganizationDocument>("Organization", OrganizationSchema);
