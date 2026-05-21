import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { chatAccessDeniedResponse } from "@/lib/chatPermissions";
import connectDB from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import { findMessagesForConversation, populateMessageById } from "@/lib/chatMessageQuery";
import { isChatReactionEmoji } from "@/lib/chatUtils";
import {
  CHAT_MESSAGE_MAX_LENGTH,
  invalidIdResponse,
  isValidObjectId,
  refreshConversationPreview,
} from "@/lib/chatRouteHelpers";
import "@/models/User";
import mongoose from "mongoose";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function assertParticipant(conversationId: string, userId: string) {
  if (!isValidObjectId(conversationId)) return null;
  return Conversation.findOne({ _id: conversationId, participants: userId });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const denied = await chatAccessDeniedResponse(session);
  if (denied) return denied;

  const { id } = await params;
  if (!isValidObjectId(id)) return invalidIdResponse();
  await connectDB();

  const conv = await assertParticipant(id, session!.user.id);
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const before = searchParams.get("before");
  const q = (searchParams.get("q") || "").trim().slice(0, 200);

  const messages = await findMessagesForConversation(
    id,
    { limit: limit + 1, before, q: q || undefined },
    escapeRegExp
  );
  const hasMore = messages.length > limit;
  const slice = hasMore ? messages.slice(messages.length - limit) : messages;

  return NextResponse.json({ messages: slice, hasMore });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const denied = await chatAccessDeniedResponse(session);
  if (denied) return denied;

  const { id } = await params;
  if (!isValidObjectId(id)) return invalidIdResponse();
  await connectDB();

  const conv = await assertParticipant(id, session!.user.id);
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const text = (body.text || "").trim();
  if (!text) return NextResponse.json({ error: "Message text required" }, { status: 400 });
  if (text.length > CHAT_MESSAGE_MAX_LENGTH) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  const replyToMessageId = typeof body.replyToMessageId === "string" ? body.replyToMessageId.trim() : "";
  let replyTo: mongoose.Types.ObjectId | undefined;
  if (replyToMessageId) {
    if (!isValidObjectId(replyToMessageId)) {
      return NextResponse.json({ error: "Reply target not found" }, { status: 400 });
    }
    const replyMsg = await Message.findOne({ _id: replyToMessageId, conversation: id }).select("_id").lean();
    if (!replyMsg) return NextResponse.json({ error: "Reply target not found" }, { status: 400 });
    replyTo = replyMsg._id;
  }

  const message = await Message.create({
    conversation: id,
    sender: session!.user.id,
    text,
    replyTo,
    reactions: [],
    readBy: [session!.user.id],
    isDeleted: false,
  });

  await Conversation.findByIdAndUpdate(id, {
    lastMessage: text.slice(0, 100),
    lastMessageAt: message.createdAt,
  });

  const populated = await populateMessageById(message._id.toString());
  return NextResponse.json(populated, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const denied = await chatAccessDeniedResponse(session);
  if (denied) return denied;

  const { id } = await params;
  if (!isValidObjectId(id)) return invalidIdResponse();
  await connectDB();

  const conv = await assertParticipant(id, session!.user.id);
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const messageId = typeof body.messageId === "string" ? body.messageId.trim() : "";
  if (!messageId || !isValidObjectId(messageId)) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  const message = await Message.findOne({ _id: messageId, conversation: id });
  if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  const action =
    typeof body.action === "string"
      ? body.action
      : typeof body.emoji === "string"
        ? "react"
        : typeof body.text === "string"
          ? "edit"
          : body.delete
            ? "delete"
            : "";

  const myId = String(session!.user.id);

  if (action === "react") {
    if (message.isDeleted) {
      return NextResponse.json({ error: "Cannot react to a deleted message" }, { status: 400 });
    }
    const emoji = typeof body.emoji === "string" ? body.emoji.trim() : "";
    if (!isChatReactionEmoji(emoji)) {
      return NextResponse.json({ error: "Valid emoji is required" }, { status: 400 });
    }
    const reactions = (message.reactions || []) as { user: mongoose.Types.ObjectId; emoji: string }[];
    const existingIdx = reactions.findIndex((r) => String(r.user) === myId);
    if (existingIdx >= 0 && message.reactions[existingIdx]?.emoji === emoji) {
      message.reactions.splice(existingIdx, 1);
    } else if (existingIdx >= 0) {
      message.reactions[existingIdx].emoji = emoji;
    } else {
      message.reactions.push({ emoji, user: new mongoose.Types.ObjectId(myId) });
    }
    await message.save();
    const updated = await populateMessageById(message._id.toString());
    return NextResponse.json(updated);
  }

  if (action === "edit") {
    if (String(message.sender) !== myId) {
      return NextResponse.json({ error: "Only the sender can edit this message" }, { status: 403 });
    }
    if (message.isDeleted) {
      return NextResponse.json({ error: "Cannot edit a deleted message" }, { status: 400 });
    }
    const text = String(body.text ?? "").trim();
    if (!text) return NextResponse.json({ error: "Message text required" }, { status: 400 });
    if (text.length > CHAT_MESSAGE_MAX_LENGTH) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }
    message.text = text;
    message.editedAt = new Date();
    await message.save();
    await Conversation.findByIdAndUpdate(id, {
      lastMessage: text.slice(0, 100),
      lastMessageAt: new Date(),
    });
    const updated = await populateMessageById(message._id.toString());
    return NextResponse.json(updated);
  }

  if (action === "delete") {
    if (String(message.sender) !== myId) {
      return NextResponse.json({ error: "Only the sender can delete this message" }, { status: 403 });
    }
    message.isDeleted = true;
    message.text = "";
    message.reactions = [];
    await message.save();
    await refreshConversationPreview(id);
    const updated = await populateMessageById(message._id.toString());
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
