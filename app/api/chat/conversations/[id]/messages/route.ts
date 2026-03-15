import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import "@/models/User";

// GET — fetch messages for a conversation (paginated)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  // Verify user is participant
  const conv = await Conversation.findOne({ _id: id, participants: session.user.id });
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const before = searchParams.get("before");

  const query: Record<string, unknown> = { conversation: id };
  if (before) query.createdAt = { $lt: new Date(before) };

  const messages = await Message.find(query)
    .populate("sender", "name email role")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json(messages.reverse());
}

// POST — send a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const conv = await Conversation.findOne({ _id: id, participants: session.user.id });
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const text = (body.text || "").trim();
  if (!text) return NextResponse.json({ error: "Message text required" }, { status: 400 });

  const message = await Message.create({
    conversation: id,
    sender: session.user.id,
    text,
    readBy: [session.user.id],
  });

  // Update conversation last message
  await Conversation.findByIdAndUpdate(id, {
    lastMessage: text.slice(0, 100),
    lastMessageAt: message.createdAt,
  });

  const populated = await Message.findById(message._id)
    .populate("sender", "name email role")
    .lean();

  return NextResponse.json(populated, { status: 201 });
}
