import mongoose, { Document, Schema } from "mongoose";

export interface IBranchDocument extends Document {
  name: string;
  location: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: Date;
}

const BranchSchema = new Schema<IBranchDocument>(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Branch || mongoose.model<IBranchDocument>("Branch", BranchSchema);
