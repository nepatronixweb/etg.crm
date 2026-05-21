import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { chatAccessDeniedResponse } from "@/lib/chatPermissions";
import connectDB from "@/lib/mongodb";
import Message from "@/models/Message";
import Conversation from "@/models/Conversation";
import "@/models/User";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

const MESSAGE_SELECT =
  "conversation sender text replyTo reactions readBy editedAt isDeleted createdAt updatedAt";

async function populateMessages(docs: unknown[]) {
  return Message.populate(docs, [
    { path: "sender", select: "name email role" },
    {
      path: "replyTo",
      populate: { path: "sender", select: "name email role" },
      select: "text sender createdAt isDeleted",
    },
    { path: "reactions.user", select: "name" },
  ]);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const denied = await chatAccessDeniedResponse(session);
  if (denied) return denied;

  const userId = session!.user.id;
  const encoder = new TextEncoder();
  let lastCheck = new Date();

  const stream = new ReadableStream({
    async start(controller) {
      await connectDB();

      const send = (payload: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          /* client disconnected */
        }
      };

      let convIds: mongoose.Types.ObjectId[] = [];
      let lastConvRefresh = 0;

      const refreshConvIds = async () => {
        const convs = await Conversation.find({ participants: userId }).select("_id").lean();
        convIds = convs.map((c) => c._id);
        lastConvRefresh = Date.now();
      };

      try {
        await refreshConvIds();
        const unread = await Message.countDocuments({
          conversation: { $in: convIds },
          sender: { $ne: userId },
          readBy: { $ne: userId },
          isDeleted: { $ne: true },
        });
        send({ type: "chat_init", unreadCount: unread });
      } catch {
        send({ type: "chat_init", unreadCount: 0 });
      }

      const basePollMs = Number(process.env.CHAT_SSE_POLL_MS ?? 3_000);
      const maxPollMs = Number(process.env.CHAT_SSE_MAX_POLL_MS ?? 12_000);
      let currentPollMs = basePollMs;
      let stopped = false;
      let timeout: ReturnType<typeof setTimeout> | null = null;

      const tick = async () => {
        if (stopped) return;
        try {
          if (Date.now() - lastConvRefresh > 60_000) await refreshConvIds();

          const since = lastCheck;
          lastCheck = new Date();

          const activityFilter = {
            conversation: { $in: convIds },
            $or: [{ createdAt: { $gt: since } }, { updatedAt: { $gt: since } }],
          };

          const [activity, unread] = await Promise.all([
            Message.find(activityFilter)
              .select(MESSAGE_SELECT)
              .sort({ updatedAt: -1 })
              .limit(100)
              .lean(),
            Message.countDocuments({
              conversation: { $in: convIds },
              sender: { $ne: userId },
              readBy: { $ne: userId },
              isDeleted: { $ne: true },
            }),
          ]);

          const populated = await populateMessages(activity);
          type MsgRow = {
            createdAt: Date | string;
            updatedAt: Date | string;
            sender?: { _id?: unknown } | unknown;
          };
          const rows = populated as unknown as MsgRow[];
          const senderIdOf = (m: MsgRow) =>
            String(typeof m.sender === "object" && m.sender && "_id" in m.sender ? m.sender._id : m.sender ?? "");

          const newMsgs = rows.filter((m) => new Date(m.createdAt).getTime() > since.getTime());
          const updatedMsgs = rows.filter((m) => {
            const created = new Date(m.createdAt).getTime();
            const updated = new Date(m.updatedAt).getTime();
            return created <= since.getTime() && updated > since.getTime();
          });

          const incomingNew = newMsgs.filter((m) => senderIdOf(m) !== userId);

          if (incomingNew.length > 0) {
            send({ type: "chat_new", messages: incomingNew, unreadCount: unread });
            currentPollMs = basePollMs;
          }
          if (updatedMsgs.length > 0) {
            send({ type: "chat_update", messages: updatedMsgs, unreadCount: unread });
            currentPollMs = basePollMs;
          }
          if (incomingNew.length === 0 && updatedMsgs.length === 0) {
            send({ type: "chat_heartbeat", unreadCount: unread, pollMs: currentPollMs });
            currentPollMs = Math.min(maxPollMs, Math.floor(currentPollMs * 1.35));
          }
        } catch {
          send({ type: "chat_heartbeat", unreadCount: 0 });
          currentPollMs = Math.min(maxPollMs, Math.floor(currentPollMs * 1.35));
        }
        timeout = setTimeout(tick, currentPollMs);
      };
      timeout = setTimeout(tick, currentPollMs);

      req.signal.addEventListener("abort", () => {
        stopped = true;
        if (timeout) clearTimeout(timeout);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
