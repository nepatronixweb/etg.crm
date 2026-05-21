import mongoose, { Document, Schema } from "mongoose";

export interface IChecklistDocument extends Document {
  country: string;
  /** null = platform template (super_admin only on list). */
  organization?: mongoose.Types.ObjectId | null;
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
    country: { type: String, required: true },
    organization: { type: Schema.Types.ObjectId, ref: "Organization", default: null, index: true },
    documents: [ChecklistItemSchema],
  },
  { timestamps: true }
);

ChecklistSchema.index({ country: 1, organization: 1 }, { unique: true });

export default mongoose.models.Checklist || mongoose.model<IChecklistDocument>("Checklist", ChecklistSchema);
