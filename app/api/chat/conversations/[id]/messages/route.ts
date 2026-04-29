import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { userHasChatAccess } from "@/lib/chatPermissions";
import connectDB from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import "@/models/User";
import mongoose from "mongoose";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET - fetch messages for a conversation (paginated)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!userHasChatAccess(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await connectDB();

  // Verify user is participant
  const conv = await Conversation.findOne({ _id: id, participants: session.user.id });
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const before = searchParams.get("before");
  const q = (searchParams.get("q") || "").trim();

  const query: Record<string, unknown> = { conversation: id };
  if (before) query.createdAt = { $lt: new Date(before) };
  if (q) query.text = { $regex: escapeRegExp(q), $options: "i" };

  const messages = await Message.find(query)
    .populate("sender", "name email role")
    .populate({
      path: "replyTo",
      populate: { path: "sender", select: "name email role" },
      select: "text sender createdAt",
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json(messages.reverse());
}

// POST - send a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!userHasChatAccess(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await connectDB();

  const conv = await Conversation.findOne({ _id: id, participants: session.user.id });
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const text = (body.text || "").trim();
  if (!text) return NextResponse.json({ error: "Message text required" }, { status: 400 });
  const replyToMessageId = typeof body.replyToMessageId === "string" ? body.replyToMessageId.trim() : "";
  let replyTo: mongoose.Types.ObjectId | undefined;
  if (replyToMessageId) {
    const baseQuery = { _id: replyToMessageId, conversation: id };
    const replyMsg = await Message.findOne(baseQuery).select("_id").lean();
    if (!replyMsg) {
      return NextResponse.json({ error: "Reply target not found" }, { status: 400 });
    }
    replyTo = replyMsg._id;
  }

  const message = await Message.create({
    conversation: id,
    sender: session.user.id,
    text,
    replyTo,
    reactions: [],
    readBy: [session.user.id],
  });

  // Update conversation last message
  await Conversation.findByIdAndUpdate(id, {
    lastMessage: text.slice(0, 100),
    lastMessageAt: message.createdAt,
  });

  const populated = await Message.findById(message._id)
    .populate("sender", "name email role")
    .populate({
      path: "replyTo",
      populate: { path: "sender", select: "name email role" },
      select: "text sender createdAt",
    })
    .lean();

  return NextResponse.json(populated, { status: 201 });
}

// PATCH - toggle reaction on a message
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!userHasChatAccess(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await connectDB();

  const conv = await Conversation.findOne({ _id: id, participants: session.user.id });
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const messageId = typeof body.messageId === "string" ? body.messageId.trim() : "";
  const emoji = typeof body.emoji === "string" ? body.emoji.trim() : "";
  if (!messageId || !["👍🏻", "❌"].includes(emoji)) {
    return NextResponse.json({ error: "messageId and valid emoji are required" }, { status: 400 });
  }

  const message = await Message.findOne({ _id: messageId, conversation: id });
  if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  const myId = String(session.user.id);
  const reactions = (message.reactions || []) as { user: mongoose.Types.ObjectId; emoji: "👍🏻" | "❌" }[];
  const existingIdx = reactions.findIndex((r) => String(r.user) === myId);
  if (existingIdx >= 0 && message.reactions[existingIdx]?.emoji === emoji) {
    message.reactions.splice(existingIdx, 1);
  } else if (existingIdx >= 0) {
    message.reactions[existingIdx].emoji = emoji as "👍🏻" | "❌";
  } else {
    message.reactions.push({ emoji: emoji as "👍🏻" | "❌", user: new mongoose.Types.ObjectId(myId) });
  }

  await message.save();
  const updated = await Message.findById(message._id)
    .populate("sender", "name email role")
    .populate({
      path: "replyTo",
      populate: { path: "sender", select: "name email role" },
      select: "text sender createdAt",
    })
    .lean();
  return NextResponse.json(updated);
}
