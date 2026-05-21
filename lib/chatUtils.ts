/** Standard quick reactions for team chat */
export const CHAT_REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉"] as const;
export type ChatReactionEmoji = (typeof CHAT_REACTION_EMOJIS)[number];

export function isChatReactionEmoji(value: string): value is ChatReactionEmoji {
  return (CHAT_REACTION_EMOJIS as readonly string[]).includes(value);
}

export function formatConversationListTime(dateStr: string | Date): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24 && isSameDay(d, now)) return `${hrs}h`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(d, yesterday)) return "Yesterday";
  const days = Math.floor(hrs / 24);
  if (days < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatMessageTimestamp(dateStr: string | Date): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  if (isSameDay(d, now)) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(d, yesterday)) {
    return `Yesterday ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  }
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDateSeparator(dateStr: string | Date): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  if (isSameDay(d, now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function shouldShowDateSeparator(current: string, previous?: string): boolean {
  if (!previous) return true;
  const a = new Date(current);
  const b = new Date(previous);
  return !isSameDay(a, b);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export type ReactionRow = { emoji: string; user: string | { _id: string; name?: string } };

export function reactionCounts(reactions: ReactionRow[] | undefined): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of reactions ?? []) {
    map.set(r.emoji, (map.get(r.emoji) ?? 0) + 1);
  }
  return map;
}

export function userReactedWith(
  reactions: ReactionRow[] | undefined,
  userId: string,
  emoji: string
): boolean {
  return (reactions ?? []).some(
    (r) => r.emoji === emoji && String(typeof r.user === "object" ? r.user._id : r.user) === String(userId)
  );
}

export function userActiveReaction(
  reactions: ReactionRow[] | undefined,
  userId: string
): string | null {
  const hit = (reactions ?? []).find(
    (r) => String(typeof r.user === "object" ? r.user._id : r.user) === String(userId)
  );
  return hit?.emoji ?? null;
}

/** 1:1 read receipt: other participant(s) have read this message */
export function isMessageReadByOthers(
  readBy: string[] | undefined,
  otherParticipantIds: string[]
): boolean {
  if (otherParticipantIds.length === 0) return false;
  const readers = new Set((readBy ?? []).map(String));
  return otherParticipantIds.every((id) => readers.has(String(id)));
}
