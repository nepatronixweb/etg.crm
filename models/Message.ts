import mongoose, { Document, Schema } from "mongoose";

export interface IMessageDocument extends Document {
  conversation: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  text: string;
  replyTo?: mongoose.Types.ObjectId;
  reactions: { emoji: "👍🏻" | "❌"; user: mongoose.Types.ObjectId }[];
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const MessageSchema = new Schema<IMessageDocument>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true },
    replyTo: { type: Schema.Types.ObjectId, ref: "Message" },
    reactions: [
      {
        emoji: { type: String, enum: ["👍🏻", "❌"], required: true },
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
      },
    ],
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

MessageSchema.index({ conversation: 1, createdAt: -1 });
MessageSchema.index({ conversation: 1, text: "text" });

const existingMessageModel = mongoose.models.Message as mongoose.Model<IMessageDocument> | undefined;

if (existingMessageModel) {
  const hasReplyTo = Boolean(existingMessageModel.schema.path("replyTo"));
  const hasReactions = Boolean(existingMessageModel.schema.path("reactions"));
  if (!hasReplyTo || !hasReactions) {
    delete mongoose.models.Message;
  }
}

const MessageModel =
  (mongoose.models.Message as mongoose.Model<IMessageDocument> | undefined) ||
  mongoose.model<IMessageDocument>("Message", MessageSchema);

export default MessageModel;
