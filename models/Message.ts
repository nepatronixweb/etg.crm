import mongoose, { Document, Schema } from "mongoose";

export interface IMessageDocument extends Document {
  conversation: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  text: string;
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const MessageSchema = new Schema<IMessageDocument>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true },
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

MessageSchema.index({ conversation: 1, createdAt: -1 });

export default mongoose.models.Message ||
  mongoose.model<IMessageDocument>("Message", MessageSchema);
