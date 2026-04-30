import mongoose, { Document, Schema } from "mongoose";
import { LeadSource, LeadStanding, LeadStatus, INote } from "@/types";

/**
 * Telecaller / import pipeline records - stored in the `enquiries` collection.
 * Separate from {@link Lead} (walk-in, front desk, counsellor-assigned CRM leads).
 */
const NoteSchema = new Schema<INote>(
  {
    content: { type: String, required: true },
    addedBy: { type: String, required: true },
    addedByName: { type: String, required: true },
    addedByRole: { type: String, required: true },
  },
  { timestamps: true }
);

export interface IEnquiryDocument extends Document {
  name: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  source: LeadSource;
  interestedService: string;
  interestedCountry: string;
  branch: mongoose.Types.ObjectId;
  standing: LeadStanding;
  assignedTo?: mongoose.Types.ObjectId;
  assignedBy?: mongoose.Types.ObjectId;
  notes: INote[];
  remindersCount: number;
  lastReminderAt?: Date;
  convertedToStudent: boolean;
  stage?: string;
  status?: LeadStatus;
  stageDates?: Record<string, Date>;
  statusDates?: Record<string, Date>;
  campaign?: string;
  importDate?: Date;
  interestedCountries: { country: string; universityName?: string }[];
  parentName?: string;
  parentPhone1?: string;
  parentPhone2?: string;
  academicScore?: string;
  academicInstitution?: string;
  temporaryAddress?: string;
  permanentAddress?: string;
  examType?: string;
  examScore?: string;
  examJoinDate?: string;
  examStartDate?: string;
  examEndDate?: string;
  examPaymentMethod?: string;
  examEstimatedDate?: string;
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  passportNumber?: string;
  visaExpiryDate?: string;
  senderName?: string;
  academicYear?: string;
  applyLevel?: string;
  course?: string;
  intakeYear?: string;
  intakeQuarter?: string;
  comments?: string;
  /** When set, this enquiry mirrors a Lead (admission / front desk / import) for the telecaller pool. */
  linkedLeadId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EnquirySchema = new Schema<IEnquiryDocument>(
  {
    name: { type: String, trim: true, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, lowercase: true, default: "" },
    dateOfBirth: { type: String, default: "" },
    source: { type: String, default: "walk_in" },
    interestedService: { type: String, default: "" },
    interestedCountry: { type: String, default: "" },
    branch: { type: Schema.Types.ObjectId, ref: "Branch" },
    standing: { type: String, default: "warm" },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User" },
    notes: [NoteSchema],
    remindersCount: { type: Number, default: 0 },
    lastReminderAt: { type: Date },
    convertedToStudent: { type: Boolean, default: false },
    stage: { type: String, default: "" },
    status: { type: String, default: "Open/Unassigned" },
    stageDates: { type: Map, of: Date, default: {} },
    statusDates: { type: Map, of: Date, default: {} },
    interestedCountries: {
      type: [{ country: { type: String }, universityName: { type: String, default: "" } }],
      default: [],
    },
    parentName: { type: String, trim: true },
    parentPhone1: { type: String },
    parentPhone2: { type: String },
    academicScore: { type: String },
    academicInstitution: { type: String, trim: true },
    temporaryAddress: { type: String, trim: true },
    permanentAddress: { type: String, trim: true },
    examType: { type: String, enum: ["IELTS", "PTE", "Duolingo", "Oxford IELTS", "TOEFL", ""], default: "" },
    examScore: { type: String },
    examJoinDate: { type: String },
    examStartDate: { type: String },
    examEndDate: { type: String },
    examPaymentMethod: { type: String, enum: ["online", "cash", ""], default: "" },
    examEstimatedDate: { type: String },
    gender: { type: String, default: "" },
    maritalStatus: { type: String, default: "" },
    nationality: { type: String, trim: true },
    passportNumber: { type: String, trim: true },
    visaExpiryDate: { type: String },
    senderName: { type: String, trim: true },
    academicYear: { type: String, trim: true },
    applyLevel: { type: String, default: "" },
    course: { type: String, trim: true },
    intakeYear: { type: String, trim: true },
    intakeQuarter: { type: String, default: "" },
    comments: { type: String, trim: true },
    campaign: { type: String, trim: true, default: "" },
    importDate: { type: Date },
    linkedLeadId: { type: Schema.Types.ObjectId, ref: "Lead", default: undefined },
  },
  { timestamps: true }
);

EnquirySchema.index({ branch: 1, standing: 1 });
EnquirySchema.index({ assignedTo: 1, standing: 1 });
EnquirySchema.index({ status: 1 });
EnquirySchema.index({ convertedToStudent: 1 });
EnquirySchema.index({ updatedAt: 1 });
EnquirySchema.index({ createdAt: -1 });
EnquirySchema.index({ source: 1 });
EnquirySchema.index({ interestedCountry: 1 });
EnquirySchema.index({ interestedService: 1 });
EnquirySchema.index({ stage: 1 });
EnquirySchema.index({ academicYear: 1 });
EnquirySchema.index({ applyLevel: 1 });
EnquirySchema.index({ branch: 1, createdAt: -1 });
EnquirySchema.index({ linkedLeadId: 1 }, { unique: true, sparse: true });

export default mongoose.models.Enquiry || mongoose.model<IEnquiryDocument>("Enquiry", EnquirySchema, "enquiries");
