import mongoose, { Document, Schema } from "mongoose";
import { LeadSource, INote } from "@/types";

const NoteSchema = new Schema<INote>(
  {
    content: { type: String, required: true },
    addedBy: { type: String, required: true },
    addedByName: { type: String, required: true },
    addedByRole: { type: String, required: true },
  },
  { timestamps: true }
);

const CountrySchema = new Schema({
  country: { type: String, required: true },
  status: {
    type: String,
    enum: ["counsellor", "application", "admission", "visa", "completed", "rejected"],
    default: "counsellor",
  },
  universityName: { type: String },
  applicationStatus: { type: String },
  admissionStatus: { type: String },
  visaStatus: { type: String },
  visaApprovedAt: { type: Date },
  rejectedAt: { type: Date },
  rejectionReason: { type: String },
});

export interface IStudentDocument extends Document {
  lead: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  source: LeadSource;
  branch: mongoose.Types.ObjectId;
  counsellor: mongoose.Types.ObjectId;
  currentStage: string;
  stage?: string;
  countries: mongoose.Types.DocumentArray<mongoose.Document>;
  notes: INote[];
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudentDocument>(
  {
    lead: { type: Schema.Types.ObjectId, ref: "Lead", required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    dateOfBirth: { type: String },
    source: { type: String, enum: ["walk_in", "facebook", "whatsapp", "instagram", "website", "referral", "other"] },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    counsellor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    currentStage: {
      type: String,
      enum: ["counsellor", "application", "admission", "visa", "completed", "rejected"],
      default: "counsellor",
    },
    stage: { type: String, default: "" },
    countries: [CountrySchema],
    notes: [NoteSchema],
  },
  { timestamps: true }
);

// Indexes for fast queries
StudentSchema.index({ branch: 1, currentStage: 1 });
StudentSchema.index({ counsellor: 1 });
StudentSchema.index({ lead: 1 }, { unique: true });
StudentSchema.index({ createdAt: -1 });

export default mongoose.models.Student || mongoose.model<IStudentDocument>("Student", StudentSchema);
