/** Browser event bus so layout SSE can feed the chat page without a second connection. */
export const CHAT_STREAM_EVENT = "etg-chat-stream";

export type ChatStreamPayload = {
  type: "chat_init" | "chat_new" | "chat_update" | "chat_heartbeat";
  messages?: unknown[];
  unreadCount?: number;
  pollMs?: number;
};

export function dispatchChatStream(payload: ChatStreamPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHAT_STREAM_EVENT, { detail: payload }));
}
