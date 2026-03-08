import mongoose, { Document, Schema } from "mongoose";
import { UserRole } from "@/types";

export interface IActivityLogDocument extends Document {
  user: mongoose.Types.ObjectId;
  userName: string;
  userRole: UserRole;
  action: string;
  module: string;
  targetId?: string;
  targetName?: string;
  details?: string;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLogDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    userRole: { type: String, required: true },
    action: { type: String, required: true },
    module: { type: String, required: true },
    targetId: { type: String },
    targetName: { type: String },
    details: { type: String },
  },
  { timestamps: true }
);

// Indexes for fast queries
ActivityLogSchema.index({ user: 1, createdAt: -1 });
ActivityLogSchema.index({ module: 1, createdAt: -1 });
ActivityLogSchema.index({ createdAt: -1 });

export default mongoose.models.ActivityLog || mongoose.model<IActivityLogDocument>("ActivityLog", ActivityLogSchema);
