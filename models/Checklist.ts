import mongoose, { Document, Schema } from "mongoose";

export interface IChecklistDocument extends Document {
  country: string;
  documents: {
    name: string;
    description?: string;
    isRequired: boolean;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const ChecklistItemSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  isRequired: { type: Boolean, default: true },
});

const ChecklistSchema = new Schema<IChecklistDocument>(
  {
    country: { type: String, required: true, unique: true },
    documents: [ChecklistItemSchema],
  },
  { timestamps: true }
);

export default mongoose.models.Checklist || mongoose.model<IChecklistDocument>("Checklist", ChecklistSchema);
