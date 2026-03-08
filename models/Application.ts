import mongoose, { Document, Schema } from "mongoose";
import { INote } from "@/types";

const NoteSchema = new Schema<INote>(
  {
    content: { type: String, required: true },
    addedBy: { type: String, required: true },
    addedByName: { type: String, required: true },
    addedByRole: { type: String, required: true },
  },
  { timestamps: true }
);

export interface IApplicationDocument extends Document {
  student: mongoose.Types.ObjectId;
  country: string;
  universityName: string;
  course: string;
  status: "pending" | "submitted" | "accepted" | "rejected" | "deferred";
  submittedBy?: mongoose.Types.ObjectId;
  submittedAt?: Date;
  notes: INote[];
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema = new Schema<IApplicationDocument>(
  {
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    country: { type: String, required: true },
    universityName: { type: String, required: true },
    course: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "submitted", "accepted", "rejected", "deferred"],
      default: "pending",
    },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User" },
    submittedAt: { type: Date },
    notes: [NoteSchema],
  },
  { timestamps: true }
);

// Indexes for fast queries
ApplicationSchema.index({ student: 1, status: 1 });
ApplicationSchema.index({ status: 1 });
ApplicationSchema.index({ createdAt: -1 });

export default mongoose.models.Application || mongoose.model<IApplicationDocument>("Application", ApplicationSchema);
