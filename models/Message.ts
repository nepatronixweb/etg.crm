import mongoose, { Document, Schema } from "mongoose";
import { CHAT_REACTION_EMOJIS } from "@/lib/chatUtils";

export interface IMessageDocument extends Document {
  conversation: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  text: string;
  replyTo?: mongoose.Types.ObjectId;
  reactions: { emoji: string; user: mongoose.Types.ObjectId }[];
  readBy: mongoose.Types.ObjectId[];
  editedAt?: Date | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessageDocument>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: 8000 },
    replyTo: { type: Schema.Types.ObjectId, ref: "Message" },
    reactions: [
      {
        emoji: { type: String, required: true, maxlength: 16 },
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
      },
    ],
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    editedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

MessageSchema.index({ conversation: 1, createdAt: -1 });
MessageSchema.index({ conversation: 1, text: "text" });
MessageSchema.index({ conversation: 1, updatedAt: -1 });

const REQUIRED_PATHS = ["replyTo", "reactions", "editedAt", "isDeleted"] as const;

const existingMessageModel = mongoose.models.Message as mongoose.Model<IMessageDocument> | undefined;

if (existingMessageModel) {
  const missing = REQUIRED_PATHS.some((p) => !existingMessageModel.schema.path(p));
  if (missing) {
    delete mongoose.models.Message;
  }
}

const MessageModel =
  (mongoose.models.Message as mongoose.Model<IMessageDocument> | undefined) ||
  mongoose.model<IMessageDocument>("Message", MessageSchema);

export { CHAT_REACTION_EMOJIS };
export default MessageModel;
