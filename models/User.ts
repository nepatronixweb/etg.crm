import mongoose, { Document, Schema } from "mongoose";
import { UserRole } from "@/types";

export interface IUserDocument extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  branch: mongoose.Types.ObjectId;
  dateOfBirth?: string;
  phone?: string;
  target?: number;
  currentCount?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["super_admin", "counsellor", "telecaller", "application_team", "admission_team", "visa_team", "front_desk"],
      required: true,
    },
    branch: { type: Schema.Types.ObjectId, ref: "Branch" },
    dateOfBirth: { type: String },
    phone: { type: String },
    target: { type: Number, default: 0 },
    currentCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUserDocument>("User", UserSchema);
