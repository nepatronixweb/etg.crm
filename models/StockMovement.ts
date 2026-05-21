import mongoose, { Document, Schema } from "mongoose";

export type StockMovementType = "in" | "out" | "adjust" | "transfer";

export interface IStockMovementDocument extends Document {
  stockItemId: mongoose.Types.ObjectId;
  type: StockMovementType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  performedBy: mongoose.Types.ObjectId;
  /** Target branch when type is transfer */
  targetBranch?: mongoose.Types.ObjectId | null;
  organization?: mongoose.Types.ObjectId | null;
}

const StockMovementSchema = new Schema<IStockMovementDocument>(
  {
    stockItemId: { type: Schema.Types.ObjectId, ref: "InventoryStock", required: true, index: true },
    type: { type: String, enum: ["in", "out", "adjust", "transfer"], required: true },
    quantity: { type: Number, required: true, min: 0 },
    previousQuantity: { type: Number, required: true, min: 0 },
    newQuantity: { type: Number, required: true, min: 0 },
    reason: { type: String, default: "", trim: true, maxlength: 512 },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetBranch: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    organization: { type: Schema.Types.ObjectId, ref: "Organization", default: null, index: true },
  },
  { timestamps: true }
);

StockMovementSchema.index({ createdAt: -1 });

export default mongoose.models.StockMovement ||
  mongoose.model<IStockMovementDocument>("StockMovement", StockMovementSchema);
