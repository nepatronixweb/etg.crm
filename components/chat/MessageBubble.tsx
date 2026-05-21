"use client";

import { useState } from "react";
import { Check, CheckCheck, CornerUpLeft, MoreHorizontal, Pencil, Trash2, Smile } from "lucide-react";
import {
  CHAT_REACTION_EMOJIS,
  formatMessageTimestamp,
  isMessageReadByOthers,
  reactionCounts,
  userReactedWith,
  type ReactionRow,
} from "@/lib/chatUtils";

export type ChatUser = { _id: string; name: string; email?: string; role?: string };

export type ChatMessage = {
  _id: string;
  conversation: string;
  sender: ChatUser;
  text: string;
  replyTo?: {
    _id: string;
    text: string;
    sender?: ChatUser;
    createdAt?: string;
    isDeleted?: boolean;
  };
  reactions?: ReactionRow[];
  readBy: string[];
  editedAt?: string | null;
  isDeleted?: boolean;
  createdAt: string;
};

type MessageBubbleProps = {
  msg: ChatMessage;
  isMe: boolean;
  myId: string;
  showAvatar: boolean;
  showName: boolean;
  otherParticipantIds: string[];
  onReply: (msg: ChatMessage) => void;
  onEdit: (msg: ChatMessage) => void;
  onDelete: (msg: ChatMessage) => void;
  onReact: (messageId: string, emoji: string) => void;
};

export default function MessageBubble({
  msg,
  isMe,
  myId,
  showAvatar,
  showName,
  otherParticipantIds,
  onReply,
  onEdit,
  onDelete,
  onReact,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const deleted = Boolean(msg.isDeleted);
  const counts = reactionCounts(msg.reactions);
  const read = isMe && isMessageReadByOthers(msg.readBy, otherParticipantIds);

  return (
    <div
      className={`flex ${isMe ? "justify-end" : "justify-start"} gap-2 group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowPicker(false);
      }}
    >
      {!isMe && (
        <div className="w-8 shrink-0">
          {showAvatar && (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-[11px] font-bold text-white shadow-sm">
              {msg.sender?.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}
        </div>
      )}

      <div className={`max-w-[min(72%,520px)] relative ${isMe ? "items-end" : "items-start"} flex flex-col`}>
        {showName && !isMe && (
          <p className="text-[11px] font-semibold text-gray-500 mb-1 ml-1">{msg.sender?.name}</p>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowActions((v) => !v);
              setShowPicker(false);
            }}
            className={`absolute -top-2 ${isMe ? "-left-7" : "-right-7"} p-1 rounded-full border border-gray-200 bg-white shadow-sm text-gray-500 sm:hidden ${
              showActions || showPicker ? "opacity-100" : "opacity-70"
            }`}
            aria-label="Message actions"
          >
            <MoreHorizontal size={14} />
          </button>

          {(showActions || showPicker) && !deleted && (
            <div
              className={`absolute -top-9 flex items-center gap-0.5 rounded-full border border-gray-200 bg-white shadow-md px-1 py-0.5 z-10 ${
                isMe ? "right-0" : "left-0"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setShowPicker((v) => !v);
                }}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
                title="React"
              >
                <Smile size={14} />
              </button>
              <button
                type="button"
                onClick={() => onReply(msg)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
                title="Reply"
              >
                <CornerUpLeft size={14} />
              </button>
              {isMe && (
                <>
                  <button
                    type="button"
                    onClick={() => onEdit(msg)}
                    className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(msg)}
                    className="p-1.5 rounded-full hover:bg-red-50 text-red-500"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          )}

          {showPicker && (
            <div
              className={`absolute -top-[4.5rem] flex gap-0.5 rounded-full border border-gray-200 bg-white shadow-lg px-2 py-1.5 z-20 ${
                isMe ? "right-0" : "left-0"
              }`}
            >
              {CHAT_REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onReact(msg._id, emoji);
                    setShowPicker(false);
                  }}
                  className={`text-lg leading-none p-1 rounded-full hover:scale-110 transition-transform ${
                    userReactedWith(msg.reactions, myId, emoji) ? "bg-blue-100 ring-2 ring-blue-300" : "hover:bg-gray-100"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <div
            className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
              deleted
                ? "bg-gray-100 border border-dashed border-gray-200 text-gray-400 italic"
                : isMe
                  ? "bg-blue-600 text-white rounded-br-md"
                  : "bg-white border border-gray-200 text-gray-800 rounded-bl-md"
            }`}
          >
            {msg.replyTo && !deleted && (
              <div
                className={`mb-2 rounded-lg border-l-4 px-2.5 py-1.5 text-xs ${
                  isMe
                    ? "border-blue-200 bg-blue-500/30 text-blue-50"
                    : "border-blue-400 bg-gray-50 text-gray-600"
                }`}
              >
                <p className="font-semibold opacity-90">
                  {msg.replyTo.sender?.name || "Message"}
                </p>
                <p className="truncate opacity-80">
                  {msg.replyTo.isDeleted ? "Message deleted" : msg.replyTo.text}
                </p>
              </div>
            )}
            {deleted ? "This message was deleted" : msg.text}
          </div>
        </div>

        {counts.size > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
            {Array.from(counts.entries()).map(([emoji, count]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(msg._id, emoji)}
                className={`inline-flex items-center gap-0.5 text-xs rounded-full px-2 py-0.5 border transition-colors ${
                  userReactedWith(msg.reactions, myId, emoji)
                    ? "bg-blue-50 border-blue-200 text-blue-800"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span>{emoji}</span>
                <span className="font-semibold tabular-nums">{count}</span>
              </button>
            ))}
          </div>
        )}

        <div className={`mt-1 flex items-center gap-1.5 px-1 ${isMe ? "justify-end" : "justify-start"}`}>
          <span className="text-[10px] text-gray-400 tabular-nums">{formatMessageTimestamp(msg.createdAt)}</span>
          {msg.editedAt && !deleted && (
            <span className="text-[10px] text-gray-400 italic">edited</span>
          )}
          {isMe && !deleted && (
            <span className="text-gray-400" title={read ? "Read" : "Sent"}>
              {read ? <CheckCheck size={12} className="text-blue-500" /> : <Check size={12} />}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
