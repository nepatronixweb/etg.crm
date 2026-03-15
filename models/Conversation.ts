import mongoose, { Document, Schema } from "mongoose";

export interface IConversationDocument extends Document {
  participants: mongoose.Types.ObjectId[];
  isGroup: boolean;
  name?: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversationDocument>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    isGroup: { type: Boolean, default: false },
    name: { type: String, trim: true },
    lastMessage: { type: String },
    lastMessageAt: { type: Date },
  },
  { timestamps: true }
);

ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ lastMessageAt: -1 });

export default mongoose.models.Conversation ||
  mongoose.model<IConversationDocument>("Conversation", ConversationSchema);
