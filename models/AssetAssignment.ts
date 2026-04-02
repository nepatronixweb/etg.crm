import mongoose, { Document, Schema } from "mongoose";

export type AssignmentRecordStatus = "active" | "returned";

export interface IAssetAssignmentDocument extends Document {
  assetId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  assignedDate: Date;
  returnedDate?: Date | null;
  status: AssignmentRecordStatus;
}

const AssetAssignmentSchema = new Schema<IAssetAssignmentDocument>(
  {
    assetId: { type: Schema.Types.ObjectId, ref: "Asset", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    assignedDate: { type: Date, required: true },
    returnedDate: { type: Date, default: null },
    status: { type: String, enum: ["active", "returned"], default: "active" },
  },
  { timestamps: true }
);

AssetAssignmentSchema.index({ assetId: 1, status: 1 });

export default mongoose.models.AssetAssignment ||
  mongoose.model<IAssetAssignmentDocument>("AssetAssignment", AssetAssignmentSchema);
