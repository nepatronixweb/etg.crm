import Message from "@/models/Message";

export async function findMessagesForConversation(
  conversationId: string,
  options: { limit: number; before?: string | null; q?: string },
  escapeRegExp: (v: string) => string
) {
  const query: Record<string, unknown> = { conversation: conversationId };
  if (options.before) query.createdAt = { $lt: new Date(options.before) };
  if (options.q) query.text = { $regex: escapeRegExp(options.q), $options: "i" };

  const messages = await Message.find(query)
    .populate("sender", "name email role")
    .populate({
      path: "replyTo",
      populate: { path: "sender", select: "name email role" },
      select: "text sender createdAt isDeleted",
    })
    .populate("reactions.user", "name")
    .sort({ createdAt: -1 })
    .limit(options.limit)
    .lean();

  return messages.reverse();
}

export async function populateMessageById(messageId: string) {
  return Message.findById(messageId)
    .populate("sender", "name email role")
    .populate({
      path: "replyTo",
      populate: { path: "sender", select: "name email role" },
      select: "text sender createdAt isDeleted",
    })
    .populate("reactions.user", "name")
    .lean();
}
