import mongoose, { Document, Schema } from "mongoose";
import { LeadSource, LeadStanding, LeadStatus, INote } from "@/types";
import { normalizeLeadPhone } from "@/lib/leadDuplicateGuard";

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
  /** Normalized phone digits for duplicate detection within a branch. */
  phoneNormalized?: string;
  standing: LeadStanding;
  assignedTo?: mongoose.Types.ObjectId;
  assignedBy?: mongoose.Types.ObjectId;
  notes: INote[];
  remindersCount: number;
  lastReminderAt?: Date;
  convertedToStudent: boolean;
  stage?: string; // For non-FD departments
  status?: LeadStatus; // Status field for FD department
  stageDates?: Record<string, Date>;
  statusDates?: Record<string, Date>;
  // Import metadata
  campaign?: string;
  importDate?: Date;
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
  passoutYear?: string;
  applyLevel?: string;
  course?: string;
  intakeYear?: string;
  intakeQuarter?: string;
  // General comments / notes at creation
  comments?: string;
  visitCaptured?: boolean;
  visitedAt?: Date;
  visitPurpose?: string;
  captureVisits?: { visitedAt: Date; visitPurpose?: string; capturedBy?: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILeadDocument>(
  {
    name: { type: String, trim: true, default: "" },
    phone: { type: String, default: "" },
    phoneNormalized: { type: String, default: "", index: true },
    email: { type: String, lowercase: true, default: "" },
    dateOfBirth: { type: String, default: "" },
    source: {
      type: String,
      default: "walk_in",
    },
    interestedService: { type: String, default: "" },
    interestedCountry: { type: String, default: "" },
    branch: { type: Schema.Types.ObjectId, ref: "Branch" },
    standing: {
      type: String,
      default: "warm",
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User" },
    notes: [NoteSchema],
    remindersCount: { type: Number, default: 0 },
    lastReminderAt: { type: Date },
    convertedToStudent: { type: Boolean, default: false },
    stage: { type: String, default: "" },
    status: {
      type: String,
      default: "Open/Unassigned",
    },
    stageDates: { type: Map, of: Date, default: {} },
    statusDates: { type: Map, of: Date, default: {} },
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
    passoutYear: { type: String, trim: true },
    applyLevel: { type: String, default: "" },
    course: { type: String, trim: true },
    intakeYear: { type: String, trim: true },
    intakeQuarter: { type: String, default: "" },
    // General comments / notes at creation
    comments: { type: String, trim: true },
    visitCaptured: { type: Boolean, default: false },
    visitedAt: { type: Date },
    visitPurpose: { type: String, trim: true, default: "" },
    captureVisits: {
      type: [
        {
          visitedAt: { type: Date, required: true },
          visitPurpose: { type: String, trim: true, default: "" },
          capturedBy: { type: String, default: "" },
        },
      ],
      default: [],
    },
    // Import metadata
    campaign: { type: String, trim: true, default: "" },
    importDate: { type: Date },
  },
  { timestamps: true }
);

// Indexes for fast queries
LeadSchema.index({ branch: 1, standing: 1 });
LeadSchema.index({ assignedTo: 1, standing: 1 });
LeadSchema.index({ status: 1 });
LeadSchema.index({ convertedToStudent: 1 });
LeadSchema.index({ updatedAt: 1 }); // for cron stale-lead queries
LeadSchema.index({ createdAt: -1 });
// Additional indexes for server-side filtering
LeadSchema.index({ source: 1 });
LeadSchema.index({ interestedCountry: 1 });
LeadSchema.index({ interestedService: 1 });
LeadSchema.index({ stage: 1 });
LeadSchema.index({ academicYear: 1 });
LeadSchema.index({ applyLevel: 1 });
LeadSchema.index({ branch: 1, createdAt: -1 }); // multi-tenant paginated list
LeadSchema.index({ branch: 1, phoneNormalized: 1 });

LeadSchema.pre("save", function syncPhoneNormalized() {
  if (this.phone) {
    this.phoneNormalized = normalizeLeadPhone(String(this.phone));
  }
});

export default mongoose.models.Lead || mongoose.model<ILeadDocument>("Lead", LeadSchema);
