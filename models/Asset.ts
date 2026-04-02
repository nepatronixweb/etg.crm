import mongoose, { Document, Schema } from "mongoose";

export type AssetCategory = "electronics" | "furniture" | "tools" | "others";
export type AssetCondition = "good" | "damaged" | "repair";
export type AssetStatus = "available" | "assigned" | "maintenance" | "retired";

export interface IAssetDocument extends Document {
  name: string;
  category: AssetCategory;
  assetTag: string;
  serialNumber: string;
  purchaseDate: Date;
  price: number;
  condition: AssetCondition;
  status: AssetStatus;
  assignedTo?: mongoose.Types.ObjectId | null;
  location: string;
}

const AssetSchema = new Schema<IAssetDocument>(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["electronics", "furniture", "tools", "others"],
      required: true,
    },
    assetTag: { type: String, required: true, unique: true, trim: true, uppercase: true },
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
  },
  { timestamps: true }
);

AssetSchema.index({ status: 1 });
AssetSchema.index({ assignedTo: 1 });

export default mongoose.models.Asset || mongoose.model<IAssetDocument>("Asset", AssetSchema);
