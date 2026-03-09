import mongoose, { Document, Schema } from "mongoose";
import { LeadSource, LeadStatus, INote } from "@/types";

const NoteSchema = new Schema<INote>(
  {
    content: { type: String, required: true },
    addedBy: { type: String, required: true },
    addedByName: { type: String, required: true },
    addedByRole: { type: String, required: true },
  },
  { timestamps: true }
);

export interface ILeadDocument extends Document {
  name: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  source: LeadSource;
  interestedService: string;
  interestedCountry: string;
  branch: mongoose.Types.ObjectId;
  status: LeadStatus;
  assignedTo?: mongoose.Types.ObjectId;
  assignedBy?: mongoose.Types.ObjectId;
  notes: INote[];
  remindersCount: number;
  lastReminderAt?: Date;
  convertedToStudent: boolean;
  stage?: string;
  // Multiple interested countries & universities
  interestedCountries: { country: string; universityName?: string }[];
  // Parent information
  parentName?: string;
  parentPhone1?: string;
  parentPhone2?: string;
  // Student academic information
  academicScore?: string;
  academicInstitution?: string;
  temporaryAddress?: string;
  permanentAddress?: string;
  // IELTS / PTE information
  examType?: string;
  examScore?: string;
  examJoinDate?: string;
  examStartDate?: string;
  examEndDate?: string;
  examPaymentMethod?: string;
  examEstimatedDate?: string;
  // Personal details
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  passportNumber?: string;
  visaExpiryDate?: string;
  senderName?: string;
  // Application details
  academicYear?: string;
  applyLevel?: string;
  course?: string;
  intakeYear?: string;
  intakeQuarter?: string;
  // General comments / notes at creation
  comments?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILeadDocument>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    dateOfBirth: { type: String, required: true },
    source: {
      type: String,
      enum: ["walk_in", "facebook", "whatsapp", "instagram", "website", "referral", "other"],
      required: true,
    },
    interestedService: { type: String, required: true },
    interestedCountry: { type: String, required: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    status: {
      type: String,
      enum: ["heated", "hot", "warm", "out_of_contact"],
      default: "warm",
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User" },
    notes: [NoteSchema],
    remindersCount: { type: Number, default: 0 },
    lastReminderAt: { type: Date },
    convertedToStudent: { type: Boolean, default: false },
    stage: { type: String, default: "" },
    // Multiple interested countries & universities
    interestedCountries: {
      type: [{ country: { type: String }, universityName: { type: String, default: "" } }],
      default: [],
    },
    // Parent information
    parentName: { type: String, trim: true },
    parentPhone1: { type: String },
    parentPhone2: { type: String },
    // Student academic information
    academicScore: { type: String },
    academicInstitution: { type: String, trim: true },
    temporaryAddress: { type: String, trim: true },
    permanentAddress: { type: String, trim: true },
    // IELTS / PTE information
    examType: { type: String, enum: ["IELTS", "PTE", "Duolingo", "Oxford IELTS", "TOEFL", ""], default: "" },
    examScore: { type: String },
    examJoinDate: { type: String },
    examStartDate: { type: String },
    examEndDate: { type: String },
    examPaymentMethod: { type: String, enum: ["online", "cash", ""], default: "" },
    examEstimatedDate: { type: String },
    // Personal details
    gender: { type: String, default: "" },
    maritalStatus: { type: String, default: "" },
    nationality: { type: String, trim: true },
    passportNumber: { type: String, trim: true },
    visaExpiryDate: { type: String },
    senderName: { type: String, trim: true },
    // Application details
    academicYear: { type: String, trim: true },
    applyLevel: { type: String, default: "" },
    course: { type: String, trim: true },
    intakeYear: { type: String, trim: true },
    intakeQuarter: { type: String, default: "" },
    // General comments / notes at creation
    comments: { type: String, trim: true },
  },
  { timestamps: true }
);

// Indexes for fast queries
LeadSchema.index({ branch: 1, status: 1 });
LeadSchema.index({ assignedTo: 1, status: 1 });
LeadSchema.index({ convertedToStudent: 1 });
LeadSchema.index({ updatedAt: 1 }); // for cron stale-lead queries
LeadSchema.index({ createdAt: -1 });

export default mongoose.models.Lead || mongoose.model<ILeadDocument>("Lead", LeadSchema);
