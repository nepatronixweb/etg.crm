import mongoose, { Document, Schema } from "mongoose";

export type AssignmentRecordStatus = "active" | "returned";

export interface IAssetAssignmentDocument extends Document {
  assetId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  assignedBy?: mongoose.Types.ObjectId | null;
  assignedDate: Date;
  returnedDate?: Date | null;
  status: AssignmentRecordStatus;
  notes: string;
  conditionOnReturn: string;
  organization?: mongoose.Types.ObjectId | null;
}

const AssetAssignmentSchema = new Schema<IAssetAssignmentDocument>(
  {
    assetId: { type: Schema.Types.ObjectId, ref: "Asset", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    assignedDate: { type: Date, required: true },
    returnedDate: { type: Date, default: null },
    status: { type: String, enum: ["active", "returned"], default: "active" },
    notes: { type: String, default: "", trim: true, maxlength: 512 },
    conditionOnReturn: { type: String, default: "", trim: true },
    organization: { type: Schema.Types.ObjectId, ref: "Organization", default: null, index: true },
  },
  { timestamps: true }
);

AssetAssignmentSchema.index({ assetId: 1, status: 1 });

export default mongoose.models.AssetAssignment ||
  mongoose.model<IAssetAssignmentDocument>("AssetAssignment", AssetAssignmentSchema);
