import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import "@/models/User";

// GET /api/chat/conversations — list my conversations
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const conversations = await Conversation.find({ participants: session.user.id })
    .populate("participants", "name email role")
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .lean();

  // For each conversation, count unread messages
  const withUnread = await Promise.all(
    conversations.map(async (c) => {
      const unread = await Message.countDocuments({
        conversation: c._id,
        sender: { $ne: session.user.id },
        readBy: { $ne: session.user.id },
      });
      return { ...c, unreadCount: unread };
    })
  );

  return NextResponse.json(withUnread);
}

// POST /api/chat/conversations — create or get existing 1-on-1, or create group
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const body = await req.json();
  const { participantId, participantIds, isGroup, name } = body;

  if (isGroup && Array.isArray(participantIds)) {
    // Group chat
    const allParticipants = [...new Set([session.user.id, ...participantIds])];
    const conv = await Conversation.create({
      participants: allParticipants,
      isGroup: true,
      name: name || "Group Chat",
    });
    const populated = await Conversation.findById(conv._id)
      .populate("participants", "name email role")
      .lean();
    return NextResponse.json(populated, { status: 201 });
  }

  // 1-on-1: find existing or create
  if (!participantId) {
    return NextResponse.json({ error: "participantId required" }, { status: 400 });
  }

  const existing = await Conversation.findOne({
    isGroup: { $ne: true },
    participants: { $all: [session.user.id, participantId], $size: 2 },
  })
    .populate("participants", "name email role")
    .lean();

  if (existing) return NextResponse.json(existing);

  const conv = await Conversation.create({
    participants: [session.user.id, participantId],
    isGroup: false,
  });

  const populated = await Conversation.findById(conv._id)
    .populate("participants", "name email role")
    .lean();

  return NextResponse.json(populated, { status: 201 });
}
