import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { chatAccessDeniedResponse } from "@/lib/chatPermissions";
import connectDB from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import { assertAllUsersInTenant } from "@/lib/tenantRecordAccess";
import { CHAT_GROUP_NAME_MAX_LENGTH, isValidObjectId } from "@/lib/chatRouteHelpers";
import "@/models/User";

const UNREAD_FILTER = { isDeleted: { $ne: true } };

// GET /api/chat/conversations - list my conversations
export async function GET() {
  const session = await auth();
  const denied = await chatAccessDeniedResponse(session);
  if (denied) return denied;

  await connectDB();

  const conversations = await Conversation.find({ participants: session!.user.id })
    .populate("participants", "name email role")
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .lean();

  const withUnread = await Promise.all(
    conversations.map(async (c) => {
      const unread = await Message.countDocuments({
        conversation: c._id,
        sender: { $ne: session!.user.id },
        readBy: { $ne: session!.user.id },
        ...UNREAD_FILTER,
      });
      return { ...c, unreadCount: unread };
    })
  );

  return NextResponse.json(withUnread);
}

// POST /api/chat/conversations - create or get existing 1-on-1, or create group
export async function POST(req: NextRequest) {
  const session = await auth();
  const denied = await chatAccessDeniedResponse(session);
  if (denied) return denied;

  await connectDB();
  const body = await req.json();
  const { participantId, participantIds, isGroup, name } = body;

  if (isGroup && Array.isArray(participantIds)) {
    const others = participantIds
      .map((id: unknown) => String(id).trim())
      .filter((id: string) => id && id !== session!.user.id && isValidObjectId(id));
    if (others.length === 0) {
      return NextResponse.json({ error: "At least one other participant is required" }, { status: 400 });
    }
    if (!(await assertAllUsersInTenant(session!, others))) {
      return NextResponse.json({ error: "One or more participants are outside your organization" }, { status: 403 });
    }
    const groupName = typeof name === "string" ? name.trim().slice(0, CHAT_GROUP_NAME_MAX_LENGTH) : "";
    const allParticipants = [...new Set([session!.user.id, ...others])];
    const conv = await Conversation.create({
      participants: allParticipants,
      isGroup: true,
      name: groupName || "Group Chat",
    });
    const populated = await Conversation.findById(conv._id)
      .populate("participants", "name email role")
      .lean();
    return NextResponse.json(populated, { status: 201 });
  }

  if (!participantId || !isValidObjectId(String(participantId))) {
    return NextResponse.json({ error: "Valid participantId required" }, { status: 400 });
  }
  if (String(participantId) === session!.user.id) {
    return NextResponse.json({ error: "Cannot start a chat with yourself" }, { status: 400 });
  }
  if (!(await assertAllUsersInTenant(session!, [String(participantId)]))) {
    return NextResponse.json({ error: "User is outside your organization" }, { status: 403 });
  }

  const existing = await Conversation.findOne({
    isGroup: { $ne: true },
    participants: { $all: [session!.user.id, participantId], $size: 2 },
  })
    .populate("participants", "name email role")
    .lean();

  if (existing) return NextResponse.json(existing);

  const conv = await Conversation.create({
    participants: [session!.user.id, participantId],
    isGroup: false,
  });

  const populated = await Conversation.findById(conv._id)
    .populate("participants", "name email role")
    .lean();

  return NextResponse.json(populated, { status: 201 });
}
