import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICommission extends Document {
  destinationCountry: string;
  applicantName: string;
  studentId: string;
  universityName: string;
  courseStartDate: string;
  courseEndDate: string;
  courseAnnualFee: string;
  tuitionFeePaid: string;
  commissionPercent: number;
  currencySymbol: string;
  amountFromPercent: string;
  intakeQuarter: "Q1" | "Q2" | "Q3" | "Q4" | "";
  intakeYear: string;
  /** @deprecated Legacy free-text; new entries use `commissionClaim` only. */
  commission: string;
  /** @deprecated Legacy free-text; new entries use `commissionClaim` only. */
  claim: string;
  /** Which period is claimed (1st-6th sem, one year). Single “commission claim” field in the form. */
  claimableIntake:
    | ""
    | "1st_sem"
    | "2nd_sem"
    | "3rd_sem"
    | "4th_sem"
    | "5th_sem"
    | "6th_sem"
    | "1_year";
  /** How commission is spread: one year, entire course, or other. */
  commissionDuration: "" | "one_year" | "entire_duration" | "other";
  incentives: string;
  /** @deprecated Replaced by OSHC fields; kept for legacy rows. */
  marketingBudget: string;
  /** OSHC provider (dropdown). */
  oshcName:
    | ""
    | "nb"
    | "bvpa"
    | "annalink"
    | "aisa"
    | "your_oshc"
    | "fly_finance";
  oshcAmount: string;
  oshcClaim: "" | "proceed" | "received";
  b2bName: string;
  b2bChannel: "direct" | "sub_agent" | "";
  commissionAmount: string;
  remarksStatus: "yes" | "received" | "processed" | "";
  commissionStatus: "" | "completed" | "discontinued";
  createdBy: mongoose.Types.ObjectId;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

const CommissionSchema = new Schema<ICommission>(
  {
    destinationCountry: { type: String, required: true, trim: true },
    applicantName: { type: String, required: true, trim: true },
    studentId: { type: String, default: "", trim: true },
    universityName: { type: String, required: true, trim: true },
    courseStartDate: { type: String, default: "" },
    courseEndDate: { type: String, default: "" },
    courseAnnualFee: { type: String, default: "" },
    tuitionFeePaid: { type: String, default: "" },
    commissionPercent: { type: Number, default: 0 },
    currencySymbol: { type: String, default: "" },
    amountFromPercent: { type: String, default: "" },
    intakeQuarter: { type: String, enum: ["Q1", "Q2", "Q3", "Q4", ""], default: "" },
    intakeYear: { type: String, default: "" },
    commission: { type: String, default: "" },
    claim: { type: String, default: "" },
    claimableIntake: {
      type: String,
      enum: ["1st_sem", "2nd_sem", "3rd_sem", "4th_sem", "5th_sem", "6th_sem", "1_year", ""],
      default: "",
    },
    commissionDuration: {
      type: String,
      enum: ["one_year", "entire_duration", "other", ""],
      default: "",
    },
    incentives: { type: String, default: "", trim: true },
    marketingBudget: { type: String, default: "", trim: true },
    oshcName: {
      type: String,
      enum: ["nb", "bvpa", "annalink", "aisa", "your_oshc", "fly_finance", ""],
      default: "",
    },
    oshcAmount: { type: String, default: "", trim: true },
    oshcClaim: { type: String, enum: ["proceed", "received", ""], default: "" },
    b2bName: { type: String, default: "" },
    b2bChannel: { type: String, enum: ["direct", "sub_agent", ""], default: "" },
    commissionAmount: { type: String, default: "" },
    remarksStatus: { type: String, enum: ["yes", "received", "processed", ""], default: "" },
    commissionStatus: { type: String, enum: ["completed", "discontinued", ""], default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdByName: { type: String, default: "" },
  },
  { timestamps: true }
);

CommissionSchema.index({ destinationCountry: 1, createdAt: -1 });
CommissionSchema.index({ createdBy: 1, createdAt: -1 });

const Commission: Model<ICommission> =
  mongoose.models.Commission || mongoose.model<ICommission>("Commission", CommissionSchema);

export default Commission;
