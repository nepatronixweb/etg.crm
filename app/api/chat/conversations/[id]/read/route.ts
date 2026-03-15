import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";

// PATCH — mark all messages as read in this conversation for current user
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const conv = await Conversation.findOne({ _id: id, participants: session.user.id });
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await Message.updateMany(
    { conversation: id, readBy: { $ne: session.user.id } },
    { $addToSet: { readBy: session.user.id } }
  );

  return NextResponse.json({ ok: true });
}
