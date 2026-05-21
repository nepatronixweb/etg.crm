import mongoose, { Document, Schema } from "mongoose";

export type AssetCondition = "good" | "damaged" | "repair";
export type AssetStatus = "available" | "assigned" | "maintenance" | "retired";

export interface IAssetDocument extends Document {
  name: string;
  /** Category slug from org inventory settings */
  category: string;
  assetTag: string;
  serialNumber: string;
  purchaseDate: Date;
  price: number;
  condition: AssetCondition;
  status: AssetStatus;
  assignedTo?: mongoose.Types.ObjectId | null;
  /** Room / shelf detail (free text) */
  location: string;
  notes: string;
  warrantyExpiry?: Date | null;
  branch?: mongoose.Types.ObjectId | null;
  /** Tenant owner; null/omitted = legacy platform (ETG) inventory. */
  organization?: mongoose.Types.ObjectId | null;
}

const AssetSchema = new Schema<IAssetDocument>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, default: "electronics" },
    assetTag: { type: String, required: true, trim: true, uppercase: true },
    serialNumber: { type: String, default: "", trim: true },
    purchaseDate: { type: Date, required: true },
    price: { type: Number, default: 0, min: 0 },
    condition: {
      type: String,
      enum: ["good", "damaged", "repair"],
      default: "good",
    },
    status: {
      type: String,
      enum: ["available", "assigned", "maintenance", "retired"],
      default: "available",
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
    location: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true, maxlength: 2000 },
    warrantyExpiry: { type: Date, default: null },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", default: null, index: true },
    organization: { type: Schema.Types.ObjectId, ref: "Organization", default: null, index: true },
  },
  { timestamps: true }
);

AssetSchema.index({ status: 1 });
AssetSchema.index({ assignedTo: 1 });
AssetSchema.index({ organization: 1, assetTag: 1 }, { unique: true });

export default mongoose.models.Asset || mongoose.model<IAssetDocument>("Asset", AssetSchema);
