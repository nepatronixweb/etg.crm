import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { userHasChatAccess } from "@/lib/chatPermissions";
import connectDB from "@/lib/mongodb";
import Message from "@/models/Message";
import Conversation from "@/models/Conversation";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (!userHasChatAccess(session)) return new Response("Forbidden", { status: 403 });

  const userId = session.user.id;
  const encoder = new TextEncoder();
  let lastCheck = new Date();

  const stream = new ReadableStream({
    async start(controller) {
      await connectDB();

      const send = (payload: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch { /* client disconnected */ }
      };

      // Cache conversation IDs - refreshed every 60s to pick up new convs
      let convIds: mongoose.Types.ObjectId[] = [];
      let lastConvRefresh = 0;

      const refreshConvIds = async () => {
        const convs = await Conversation.find({ participants: userId }).select("_id").lean();
        convIds = convs.map((c) => c._id);
        lastConvRefresh = Date.now();
      };

      // Initial: load convIds + unread count
      try {
        await refreshConvIds();
        const unread = await Message.countDocuments({
          conversation: { $in: convIds },
          sender: { $ne: userId },
          readBy: { $ne: userId },
        });
        send({ type: "chat_init", unreadCount: unread });
      } catch {
        send({ type: "chat_init", unreadCount: 0 });
      }

      const basePollMs = Number(process.env.CHAT_SSE_POLL_MS ?? 8_000);
      const maxPollMs = Number(process.env.CHAT_SSE_MAX_POLL_MS ?? 25_000);
      let currentPollMs = basePollMs;
      let stopped = false;
      let timeout: ReturnType<typeof setTimeout> | null = null;

      const tick = async () => {
        if (stopped) return;
        try {
          if (Date.now() - lastConvRefresh > 60_000) await refreshConvIds();

          const since = lastCheck;
          lastCheck = new Date();

          const [newMessages, unread] = await Promise.all([
            Message.find({
              conversation: { $in: convIds },
              sender: { $ne: userId },
              createdAt: { $gt: since },
            })
              .populate("sender", "name email role")
              .populate({
                path: "replyTo",
                populate: { path: "sender", select: "name email role" },
                select: "text sender createdAt",
              })
              .sort({ createdAt: -1 })
              .limit(10)
              .lean(),
            Message.countDocuments({
              conversation: { $in: convIds },
              sender: { $ne: userId },
              readBy: { $ne: userId },
            }),
          ]);

          if (newMessages.length > 0) {
            send({ type: "chat_new", messages: newMessages, unreadCount: unread });
            currentPollMs = basePollMs;
          } else {
            send({ type: "chat_heartbeat", unreadCount: unread, pollMs: currentPollMs });
            currentPollMs = Math.min(maxPollMs, Math.floor(currentPollMs * 1.4));
          }
        } catch {
          send({ type: "chat_heartbeat", unreadCount: 0 });
          currentPollMs = Math.min(maxPollMs, Math.floor(currentPollMs * 1.4));
        }
        timeout = setTimeout(tick, currentPollMs);
      };
      timeout = setTimeout(tick, currentPollMs);

      req.signal.addEventListener("abort", () => {
        stopped = true;
        if (timeout) clearTimeout(timeout);
        try { controller.close(); } catch { /* already closed */ }
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
