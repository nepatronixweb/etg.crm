import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { chatAccessDeniedResponse } from "@/lib/chatPermissions";
import connectDB from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import { invalidIdResponse, isValidObjectId } from "@/lib/chatRouteHelpers";

// PATCH - mark all messages as read in this conversation for current user
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const denied = await chatAccessDeniedResponse(session);
  if (denied) return denied;

  const { id } = await params;
  if (!isValidObjectId(id)) return invalidIdResponse();
  await connectDB();

  const conv = await Conversation.findOne({ _id: id, participants: session!.user.id });
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await Message.updateMany(
    { conversation: id, readBy: { $ne: session!.user.id }, isDeleted: { $ne: true } },
    { $addToSet: { readBy: session!.user.id } }
  );

  return NextResponse.json({ ok: true });
}
