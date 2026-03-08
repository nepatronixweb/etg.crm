import mongoose, { Document, Schema } from "mongoose";

export interface IDocumentDocument extends Document {
  student?: mongoose.Types.ObjectId;
  lead?: mongoose.Types.ObjectId;
  country?: string;
  name: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  uploadedBy: mongoose.Types.ObjectId;
  isVerified: boolean;
  verifiedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const DocumentSchema = new Schema<IDocumentDocument>(
  {
    student: { type: Schema.Types.ObjectId, ref: "Student" },
    lead: { type: Schema.Types.ObjectId, ref: "Lead" },
    country: { type: String },
    name: { type: String, required: true },
    originalName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileSize: { type: Number },
    fileType: { type: String },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isVerified: { type: Boolean, default: false },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Indexes for fast queries
DocumentSchema.index({ student: 1 });
DocumentSchema.index({ lead: 1 });
DocumentSchema.index({ uploadedBy: 1 });

export default mongoose.models.StudentDocument || mongoose.model<IDocumentDocument>("StudentDocument", DocumentSchema);
