import mongoose from "mongoose";
import { NextResponse } from "next/server";

export function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

export function invalidIdResponse(): NextResponse {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

/** Latest non-deleted message preview for conversation sidebar. */
export async function refreshConversationPreview(conversationId: string) {
  const Message = (await import("@/models/Message")).default;
  const Conversation = (await import("@/models/Conversation")).default;

  const latest = await Message.findOne({
    conversation: conversationId,
    isDeleted: { $ne: true },
  })
    .sort({ createdAt: -1 })
    .select("text createdAt")
    .lean();

  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: latest?.text ? String(latest.text).slice(0, 100) : "",
    lastMessageAt: latest?.createdAt ?? new Date(),
  });
}

export const CHAT_MESSAGE_MAX_LENGTH = 8000;
export const CHAT_GROUP_NAME_MAX_LENGTH = 120;
