import mongoose, { Document, Schema } from "mongoose";

export interface IInventoryStockDocument extends Document {
  name: string;
  sku: string;
  category: string;
  quantity: number;
  minStock: number;
  unit: string;
  notes: string;
  branch?: mongoose.Types.ObjectId | null;
  /** Tenant owner; null/omitted = legacy platform (ETG) stock. */
  organization?: mongoose.Types.ObjectId | null;
}

const InventoryStockSchema = new Schema<IInventoryStockDocument>(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, default: "", trim: true, uppercase: true },
    category: { type: String, default: "others", trim: true },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    minStock: { type: Number, required: true, default: 0, min: 0 },
    unit: { type: String, required: true, default: "pcs", trim: true },
    notes: { type: String, default: "", trim: true, maxlength: 1000 },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", default: null, index: true },
    organization: { type: Schema.Types.ObjectId, ref: "Organization", default: null, index: true },
  },
  { timestamps: true }
);

InventoryStockSchema.index({ organization: 1, branch: 1, name: 1 });

export default mongoose.models.InventoryStock ||
  mongoose.model<IInventoryStockDocument>("InventoryStock", InventoryStockSchema);
