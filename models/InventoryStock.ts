import mongoose, { Document, Schema } from "mongoose";

export interface IInventoryStockDocument extends Document {
  name: string;
  quantity: number;
  minStock: number;
  unit: string;
}

const InventoryStockSchema = new Schema<IInventoryStockDocument>(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    minStock: { type: Number, required: true, default: 0, min: 0 },
    unit: { type: String, required: true, default: "pcs", trim: true },
  },
  { timestamps: true }
);

InventoryStockSchema.index({ name: 1 });

export default mongoose.models.InventoryStock ||
  mongoose.model<IInventoryStockDocument>("InventoryStock", InventoryStockSchema);
