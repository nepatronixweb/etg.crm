"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  MessageCircle, Send, ArrowLeft, Search, Plus, Users, X,
} from "lucide-react";
import { getRoleLabel } from "@/lib/utils";
import { UserRole } from "@/types";

interface IUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface IConversation {
  _id: string;
  participants: IUser[];
  isGroup: boolean;
  name?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

interface IMessage {
  _id: string;
  conversation: string;
  sender: IUser;
  text: string;
  readBy: string[];
  createdAt: string;
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMsgTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export default function ChatPage() {
  const { data: session } = useSession();
  const myId = session?.user?.id;

  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [activeConv, setActiveConv] = useState<IConversation | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // New chat modal
  const [showNewChat, setShowNewChat] = useState(false);
  const [allUsers, setAllUsers] = useState<IUser[]>([]);
  const [userSearch, setUserSearch] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatStreamRef = useRef<EventSource | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio("/sounds/message-tone.mp3");
    audioRef.current.volume = 0.5;
  }, []);

  const playMessageTone = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => { /* autoplay blocked */ });
    }
  }, []);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    try {
      const res = await fetch(`/api/chat/conversations/${convId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch { /* silent */ }
    setLoadingMsgs(false);
  }, []);

  // Mark conversation as read
  const markRead = useCallback(async (convId: string) => {
    try {
      await fetch(`/api/chat/conversations/${convId}/read`, { method: "PATCH" });
    } catch { /* silent */ }
  }, []);

  // Select conversation
  const selectConversation = useCallback((conv: IConversation) => {
    setActiveConv(conv);
    fetchMessages(conv._id);
    markRead(conv._id);
    // Update unread locally
    setConversations((prev) =>
      prev.map((c) => c._id === conv._id ? { ...c, unreadCount: 0 } : c)
    );
  }, [fetchMessages, markRead]);

  // Send message
  const sendMessage = async () => {
    if (!msgText.trim() || !activeConv || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/chat/conversations/${activeConv._id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msgText.trim() }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        setMsgText("");
        // Update conversation last message locally
        setConversations((prev) =>
          prev.map((c) =>
            c._id === activeConv._id
              ? { ...c, lastMessage: msg.text, lastMessageAt: msg.createdAt }
              : c
          ).sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime())
        );
      }
    } catch { /* silent */ }
    setSending(false);
    inputRef.current?.focus();
  };

  // SSE for real-time messages
  useEffect(() => {
    if (!session) return;
    let retryTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      const es = new EventSource("/api/chat/stream");
      chatStreamRef.current = es;

      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === "chat_new" && payload.messages?.length > 0) {
            playMessageTone();

            // If any message belongs to active conversation, append it
            const newMsgs: IMessage[] = payload.messages;
            setActiveConv((current) => {
              if (current) {
                const forThisConv = newMsgs.filter((m) => m.conversation === current._id);
                if (forThisConv.length > 0) {
                  setMessages((prev) => {
                    const existingIds = new Set(prev.map((p) => p._id));
                    const fresh = forThisConv.filter((m) => !existingIds.has(m._id));
                    return fresh.length > 0 ? [...prev, ...fresh] : prev;
                  });
                  // mark as read since we're looking at this conv
                  markRead(current._id);
                }
              }
              return current;
            });

            // Refresh conversation list
            fetchConversations();
          } else if (payload.type === "chat_heartbeat" || payload.type === "chat_init") {
            // Silently update unread counts
            setConversations((prev) => {
              if (prev.length === 0 && payload.unreadCount > 0) {
                fetchConversations();
              }
              return prev;
            });
          }
        } catch { /* malformed */ }
      };

      es.onerror = () => {
        es.close();
        chatStreamRef.current = null;
        retryTimeout = setTimeout(connect, 5000);
      };
    };

    connect();
    return () => {
      chatStreamRef.current?.close();
      clearTimeout(retryTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // New chat helpers
  const openNewChat = async () => {
    setShowNewChat(true);
    try {
      const res = await fetch("/api/chat/users");
      if (res.ok) setAllUsers(await res.json());
    } catch { /* silent */ }
  };

  const startChat = async (userId: string) => {
    setShowNewChat(false);
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: userId }),
      });
      if (res.ok) {
        const conv = await res.json();
        await fetchConversations();
        selectConversation({ ...conv, unreadCount: 0 });
      }
    } catch { /* silent */ }
  };

  // Helper: get display name for conversation
  const getConvName = (conv: IConversation) => {
    if (conv.isGroup) return conv.name || "Group";
    const other = conv.participants?.find((p) => p._id !== myId);
    return other?.name || "Unknown";
  };

  const getConvRole = (conv: IConversation) => {
    if (conv.isGroup) return `${conv.participants.length} members`;
    const other = conv.participants?.find((p) => p._id !== myId);
    return other ? getRoleLabel(other.role as UserRole) : "";
  };

  const getInitial = (conv: IConversation) => {
    return getConvName(conv).charAt(0).toUpperCase();
  };

  // Filter conversations by search
  const filteredConvs = conversations.filter((c) => {
    if (!searchQuery) return true;
    const name = getConvName(c).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  // Filtered users for new chat
  const filteredUsers = allUsers.filter((u) => {
    if (!userSearch) return true;
    return u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading chats</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Conversation List */}
      <div className={`w-80 border-r border-gray-200 flex flex-col shrink-0 ${activeConv ? "hidden md:flex" : "flex"}`}>
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageCircle size={18} className="text-gray-700" />
              <h2 className="text-sm font-bold text-gray-900">Messages</h2>
              {conversations.reduce((sum, c) => sum + c.unreadCount, 0) > 0 && (
                <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                  {conversations.reduce((sum, c) => sum + c.unreadCount, 0)}
                </span>
              )}
            </div>
            <button
              onClick={openNewChat}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              title="New chat"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-300"
            />
          </div>
        </div>

        {/* Conversation items */}
        <div className="flex-1 overflow-y-auto">
          {filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <MessageCircle size={20} className="text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600">No conversations yet</p>
              <p className="text-xs text-gray-400 mt-1">Start a new chat with a team member</p>
              <button
                onClick={openNewChat}
                className="mt-3 px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 transition-colors"
              >
                New Chat
              </button>
            </div>
          ) : (
            filteredConvs.map((conv) => (
              <button
                key={conv._id}
                onClick={() => selectConversation(conv)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 border-b border-gray-50 transition-colors ${
                  activeConv?._id === conv._id ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                  conv.isGroup ? "bg-indigo-500" : "bg-blue-500"
                }`}>
                  {conv.isGroup ? <Users size={15} /> : getInitial(conv)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{getConvName(conv)}</p>
                    {conv.lastMessageAt && (
                      <span className="text-[11px] text-gray-400 shrink-0">{timeAgo(conv.lastMessageAt)}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-gray-500 truncate">{conv.lastMessage || getConvRole(conv)}</p>
                    {conv.unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Message Thread */}
      <div className={`flex-1 flex flex-col ${!activeConv ? "hidden md:flex" : "flex"}`}>
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <MessageCircle size={28} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700">Select a conversation</h3>
            <p className="text-sm text-gray-400 mt-1 max-w-xs">Choose an existing chat or start a new conversation with a team member</p>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3 bg-white">
              <button
                onClick={() => setActiveConv(null)}
                className="md:hidden p-1 rounded-md hover:bg-gray-100 text-gray-500"
              >
                <ArrowLeft size={18} />
              </button>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                activeConv.isGroup ? "bg-indigo-500" : "bg-blue-500"
              }`}>
                {activeConv.isGroup ? <Users size={14} /> : getInitial(activeConv)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{getConvName(activeConv)}</p>
                <p className="text-xs text-gray-400">{getConvRole(activeConv)}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
              {loadingMsgs ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-400">No messages yet. Say hello!</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.sender?._id === myId;
                  const showAvatar = !isMe && (idx === 0 || messages[idx - 1]?.sender?._id !== msg.sender?._id);
                  return (
                    <div key={msg._id} className={`flex ${isMe ? "justify-end" : "justify-start"} gap-2`}>
                      {!isMe && (
                        <div className="w-7 shrink-0">
                          {showAvatar && (
                            <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-700">
                              {msg.sender?.name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                          )}
                        </div>
                      )}
                      <div className={`max-w-[70%] ${isMe ? "order-1" : ""}`}>
                        {showAvatar && !isMe && (
                          <p className="text-[11px] font-semibold text-gray-500 mb-0.5 ml-1">{msg.sender?.name}</p>
                        )}
                        <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                          isMe
                            ? "bg-blue-600 text-white rounded-br-md"
                            : "bg-white border border-gray-200 text-gray-800 rounded-bl-md"
                        }`}>
                          {msg.text}
                        </div>
                        <p className={`text-[10px] mt-0.5 px-1 ${isMe ? "text-right text-gray-400" : "text-gray-400"}`}>
                          {formatMsgTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-gray-200 bg-white">
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Type a message..."
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!msgText.trim() || sending}
                  className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">New Conversation</h3>
              <button onClick={() => setShowNewChat(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search team members..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-300"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
              {filteredUsers.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">No users found</div>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user._id}
                    onClick={() => startChat(user._id)}
                    className="w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-400 truncate">{getRoleLabel(user.role as UserRole)} &middot; {user.email}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
