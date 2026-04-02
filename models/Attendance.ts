import mongoose, { Document, Schema } from "mongoose";

export type AttendanceStatus = "present" | "invalid";

export interface IAttendanceDocument extends Document {
  userId: mongoose.Types.ObjectId;
  date: string;
  checkIn: Date;
  checkOut?: Date;
  ip: string;
  location: { lat: number; lng: number };
  status: AttendanceStatus;
}

const AttendanceSchema = new Schema<IAttendanceDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true, trim: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date },
    ip: { type: String, default: "" },
    location: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
    },
    status: { type: String, enum: ["present", "invalid"], required: true },
  },
  { timestamps: true }
);

AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.models.Attendance || mongoose.model<IAttendanceDocument>("Attendance", AttendanceSchema);
