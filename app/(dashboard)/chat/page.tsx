"use client";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  MessageCircle, Send, ArrowLeft, Search, Plus, Users, X, AlertCircle, Loader2,
} from "lucide-react";
import { getRoleLabel, hasPermission } from "@/lib/utils";
import { isOrgWideAdmin } from "@/lib/roleGuards";
import { UserRole } from "@/types";
import { formatConversationListTime, shouldShowDateSeparator } from "@/lib/chatUtils";
import { CHAT_STREAM_EVENT, type ChatStreamPayload } from "@/lib/chatEvents";
import MessageBubble, { type ChatMessage } from "@/components/chat/MessageBubble";
import ChatDateSeparator from "@/components/chat/ChatDateSeparator";

async function parseChatError(res: Response): Promise<string> {
  try {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const j = (await res.json()) as { error?: string; message?: string; code?: string };
      const msg = j.error || j.message || j.code;
      if (typeof msg === "string" && msg.trim()) return msg.trim();
    }
  } catch {
    /* ignore */
  }
  if (res.status === 401) return "Your session expired. Please sign in again.";
  if (res.status === 403) return "You do not have access to chat.";
  if (res.status === 402) return "Subscription required. Update billing to restore access.";
  return `Something went wrong (${res.status}). Try again or contact support.`;
}

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

function playChatTone(audioRef: React.MutableRefObject<HTMLAudioElement | null>) {
  if (audioRef.current) {
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {
      /* autoplay blocked or missing file */
    });
  }
}

export default function ChatPage() {
  const { data: session, status: sessionStatus } = useSession();
  const myId = session?.user?.id;
  const role = session?.user?.role as UserRole | undefined;
  const userPermissions = (session?.user?.permissions ?? []) as string[];
  const hasChatPermission =
    !!session?.user && hasPermission(userPermissions, "chat", role);
  const [enabledModules, setEnabledModules] = useState<string[] | null>(null);
  const settingsLoaded = enabledModules !== null;
  const chatModuleAllowed =
    settingsLoaded &&
    (enabledModules.includes("chat") || isOrgWideAdmin(role));

  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [activeConv, setActiveConv] = useState<IConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [searchingMessages, setSearchingMessages] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  // New chat modal
  const [showNewChat, setShowNewChat] = useState(false);
  const [allUsers, setAllUsers] = useState<IUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [apiBanner, setApiBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!apiBanner) return;
    const t = setTimeout(() => setApiBanner(null), 8000);
    return () => clearTimeout(t);
  }, [apiBanner]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const activeConvIdRef = useRef<string | null>(null);
  const skipScrollRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastGlobalUnreadRef = useRef(0);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio("/sounds/message-tone.mp3");
    audioRef.current.volume = 0.5;
  }, []);

  const playMessageTone = useCallback(() => playChatTone(audioRef), []);

  useEffect(() => {
    fetch("/api/settings/app")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.enabledModules)) setEnabledModules(d.enabledModules);
      })
      .catch(() => {});
  }, []);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const r = session?.user?.role as UserRole | undefined;
      const perms = (session?.user?.permissions ?? []) as string[];
      if (!session?.user || !hasPermission(perms, "chat", r)) {
        setLoading(false);
        return;
      }
      const moduleOk =
        settingsLoaded &&
        (enabledModules.includes("chat") || isOrgWideAdmin(r));
      if (!moduleOk) {
        setLoading(false);
        return;
      }
      const res = await fetch("/api/chat/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        setApiBanner(null);
      } else {
        setApiBanner(await parseChatError(res));
      }
    } catch {
      setApiBanner("Could not load conversations. Check your connection and try again.");
    }
    setLoading(false);
  }, [session, enabledModules]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    if (!session?.user) return;
    const r = session.user.role as UserRole;
    const perms = (session.user.permissions ?? []) as string[];
    if (!hasPermission(perms, "chat", r)) return;
    const allowed =
      settingsLoaded &&
      (enabledModules.includes("chat") || isOrgWideAdmin(r));
    if (!allowed) {
      setConversations([]);
      setActiveConv(null);
      setMessages([]);
    }
  }, [session, enabledModules]);

  const parseMessagesResponse = (data: unknown): { messages: ChatMessage[]; hasMore: boolean } => {
    if (Array.isArray(data)) return { messages: data as ChatMessage[], hasMore: false };
    const obj = data as { messages?: ChatMessage[]; hasMore?: boolean };
    return { messages: obj.messages ?? [], hasMore: Boolean(obj.hasMore) };
  };

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (convId: string, query?: string) => {
    setLoadingMsgs(true);
    setSearchingMessages(Boolean(query?.trim()));
    try {
      const q = query?.trim();
      const url = q
        ? `/api/chat/conversations/${convId}/messages?q=${encodeURIComponent(q)}&limit=100`
        : `/api/chat/conversations/${convId}/messages?limit=50`;
      const res = await fetch(url);
      if (activeConvIdRef.current !== convId) return;
      if (res.ok) {
        const data = await res.json();
        const { messages: list, hasMore } = parseMessagesResponse(data);
        if (activeConvIdRef.current !== convId) return;
        setMessages(list);
        setHasMoreMessages(hasMore);
        setApiBanner(null);
      } else {
        setApiBanner(await parseChatError(res));
      }
    } catch {
      if (activeConvIdRef.current === convId) {
        setApiBanner("Could not load messages. Check your connection and try again.");
      }
    }
    if (activeConvIdRef.current === convId) {
      setLoadingMsgs(false);
      setSearchingMessages(false);
    }
  }, []);

  const loadOlderMessages = useCallback(async () => {
    if (!activeConv || loadingOlder || !hasMoreMessages || messages.length === 0) return;
    const convId = activeConv._id;
    setLoadingOlder(true);
    skipScrollRef.current = true;
    const scrollEl = messagesScrollRef.current;
    const prevHeight = scrollEl?.scrollHeight ?? 0;
    try {
      const oldest = messages[0]?.createdAt;
      const res = await fetch(
        `/api/chat/conversations/${convId}/messages?limit=50&before=${encodeURIComponent(oldest)}`
      );
      if (activeConvIdRef.current !== convId) return;
      if (res.ok) {
        const data = await res.json();
        const { messages: older, hasMore } = parseMessagesResponse(data);
        if (activeConvIdRef.current !== convId) return;
        setHasMoreMessages(hasMore);
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m._id));
          const fresh = older.filter((m) => !ids.has(m._id));
          return fresh.length > 0 ? [...fresh, ...prev] : prev;
        });
        requestAnimationFrame(() => {
          if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight - prevHeight;
        });
      }
    } catch {
      if (activeConvIdRef.current === convId) {
        setApiBanner("Could not load older messages.");
      }
    }
    setLoadingOlder(false);
  }, [activeConv, loadingOlder, hasMoreMessages, messages]);

  // Mark conversation as read
  const markRead = useCallback(async (convId: string) => {
    try {
      await fetch(`/api/chat/conversations/${convId}/read`, { method: "PATCH" });
    } catch { /* silent */ }
  }, []);

  // Select conversation
  const selectConversation = useCallback((conv: IConversation) => {
    activeConvIdRef.current = conv._id;
    skipScrollRef.current = false;
    setActiveConv(conv);
    setMessageSearch("");
    setReplyingTo(null);
    setEditingMessage(null);
    setMsgText("");
    fetchMessages(conv._id, "");
    markRead(conv._id);
    setConversations((prev) =>
      prev.map((c) => c._id === conv._id ? { ...c, unreadCount: 0 } : c)
    );
  }, [fetchMessages, markRead]);

  const mergeMessages = useCallback((incoming: ChatMessage[]) => {
    setMessages((prev) => {
      const map = new Map(prev.map((m) => [m._id, m]));
      for (const m of incoming) map.set(m._id, m);
      return Array.from(map.values()).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });
  }, []);

  // Send or edit message
  const sendMessage = async () => {
    if (!msgText.trim() || !activeConv || sending) return;
    setSending(true);
    try {
      if (editingMessage) {
        const res = await fetch(`/api/chat/conversations/${activeConv._id}/messages`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "edit", messageId: editingMessage._id, text: msgText.trim() }),
        });
        if (res.ok) {
          const msg = (await res.json()) as ChatMessage;
          mergeMessages([msg]);
          setMsgText("");
          setEditingMessage(null);
          setApiBanner(null);
        } else {
          setApiBanner(await parseChatError(res));
        }
      } else {
        const res = await fetch(`/api/chat/conversations/${activeConv._id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: msgText.trim(),
            replyToMessageId: replyingTo?._id,
          }),
        });
        if (res.ok) {
          const msg = (await res.json()) as ChatMessage;
          mergeMessages([msg]);
          setMsgText("");
          setReplyingTo(null);
          setApiBanner(null);
          setConversations((prev) =>
            prev
              .map((c) =>
                c._id === activeConv._id
                  ? { ...c, lastMessage: msg.text, lastMessageAt: msg.createdAt }
                  : c
              )
              .sort(
                (a, b) =>
                  new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
              )
          );
        } else {
          setApiBanner(await parseChatError(res));
        }
      }
    } catch {
      setApiBanner("Could not send the message. Check your connection and try again.");
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!activeConv) return;
    try {
      const res = await fetch(`/api/chat/conversations/${activeConv._id}/messages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "react", messageId, emoji }),
      });
      if (res.ok) {
        const updated = (await res.json()) as ChatMessage;
        mergeMessages([updated]);
        setApiBanner(null);
      } else {
        setApiBanner(await parseChatError(res));
      }
    } catch {
      setApiBanner("Could not update reaction. Check your connection and try again.");
    }
  };

  const deleteMessage = async (msg: ChatMessage) => {
    if (!activeConv || !confirm("Delete this message for everyone?")) return;
    try {
      const res = await fetch(`/api/chat/conversations/${activeConv._id}/messages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", messageId: msg._id }),
      });
      if (res.ok) {
        const updated = (await res.json()) as ChatMessage;
        mergeMessages([updated]);
      } else {
        setApiBanner(await parseChatError(res));
      }
    } catch {
      setApiBanner("Could not delete message.");
    }
  };

  const startEditMessage = (msg: ChatMessage) => {
    setEditingMessage(msg);
    setReplyingTo(null);
    setMsgText(msg.text);
    inputRef.current?.focus();
  };

  // Real-time updates via shared layout SSE (single connection)
  useEffect(() => {
    if (!session?.user) return;
    const r = session.user.role as UserRole;
    const perms = (session.user.permissions ?? []) as string[];
    if (!hasPermission(perms, "chat", r)) return;
    const moduleOk =
      settingsLoaded &&
      (enabledModules!.includes("chat") || isOrgWideAdmin(r));
    if (!moduleOk) return;

    const senderId = (m: ChatMessage) =>
      String(typeof m.sender === "object" ? m.sender?._id : m.sender ?? "");

    const onStream = (ev: Event) => {
      const payload = (ev as CustomEvent<ChatStreamPayload>).detail;
      if (!payload) return;

      if (payload.type === "chat_new" && payload.messages?.length) {
        const newMsgs = payload.messages as ChatMessage[];
        const activeId = activeConvIdRef.current;
        const forActive = activeId
          ? newMsgs.filter((m) => m.conversation === activeId)
          : [];
        const fromOthersInBackground = newMsgs.some(
          (m) =>
            m.conversation !== activeId &&
            senderId(m) !== myId
        );
        const fromOthersInActive = forActive.some((m) => senderId(m) !== myId);

        if (fromOthersInBackground || (fromOthersInActive && document.hidden)) {
          playMessageTone();
        }

        if (forActive.length > 0 && activeId) {
          mergeMessages(forActive);
          markRead(activeId);
        }
        fetchConversations();
      } else if (payload.type === "chat_update" && payload.messages?.length) {
        const updates = payload.messages as ChatMessage[];
        const activeId = activeConvIdRef.current;
        if (activeId) {
          const forThisConv = updates.filter((m) => m.conversation === activeId);
          if (forThisConv.length > 0) mergeMessages(forThisConv);
        }
      } else if (payload.type === "chat_heartbeat" || payload.type === "chat_init") {
        const unread = payload.unreadCount ?? 0;
        if (unread !== lastGlobalUnreadRef.current) {
          lastGlobalUnreadRef.current = unread;
          fetchConversations();
        }
      }
    };

    window.addEventListener(CHAT_STREAM_EVENT, onStream);
    return () => window.removeEventListener(CHAT_STREAM_EVENT, onStream);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, enabledModules, settingsLoaded, myId]);

  useEffect(() => {
    if (skipScrollRef.current) {
      skipScrollRef.current = false;
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!activeConv || !messageSearch.trim()) return;
    const convId = activeConv._id;
    const timeout = setTimeout(() => {
      fetchMessages(convId, messageSearch);
    }, 250);
    return () => clearTimeout(timeout);
  }, [activeConv, messageSearch, fetchMessages]);

  // New chat helpers
  const openNewChat = async () => {
    setShowNewChat(true);
    try {
      const res = await fetch("/api/chat/users");
      if (res.ok) {
        setAllUsers(await res.json());
        setApiBanner(null);
      } else {
        setApiBanner(await parseChatError(res));
      }
    } catch {
      setApiBanner("Could not load team members. Check your connection and try again.");
    }
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
        setApiBanner(null);
        await fetchConversations();
        selectConversation({ ...conv, unreadCount: 0 });
      } else {
        setApiBanner(await parseChatError(res));
      }
    } catch {
      setApiBanner("Could not start the conversation. Check your connection and try again.");
    }
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

  const otherParticipantIds = useMemo(() => {
    if (!activeConv || !myId) return [];
    return activeConv.participants.filter((p) => p._id !== myId).map((p) => p._id);
  }, [activeConv, myId]);

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

  if (sessionStatus === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (session && !hasChatPermission) {
    return (
      <div className="flex items-center justify-center min-h-[320px] px-4">
        <div className="max-w-md text-center rounded-xl border border-amber-200 bg-amber-50 px-6 py-8">
          <MessageCircle size={28} className="text-amber-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-amber-900">Chat is not enabled for your account</p>
          <p className="text-xs text-amber-800/90 mt-2">
            An administrator can turn it on under User management → Module permissions (Chat). After it is assigned,
            your access updates within about a minute, or refresh this page.
          </p>
        </div>
      </div>
    );
  }

  if (session && session.user.orgAccessAllowed === false) {
    return (
      <div className="flex items-center justify-center min-h-[320px] px-4">
        <div className="max-w-md text-center rounded-xl border border-red-200 bg-red-50 px-6 py-8">
          <MessageCircle size={28} className="text-red-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-red-900">Subscription required</p>
          <p className="text-xs text-red-800/90 mt-2">
            Chat is unavailable until billing is updated for your organization.
          </p>
        </div>
      </div>
    );
  }

  if (session && hasChatPermission && settingsLoaded && !chatModuleAllowed) {
    return (
      <div className="flex items-center justify-center min-h-[320px] px-4">
        <div className="max-w-md text-center rounded-xl border border-slate-200 bg-slate-50 px-6 py-8">
          <MessageCircle size={28} className="text-slate-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-900">Chat is turned off for your organization</p>
          <p className="text-xs text-slate-600 mt-2">
            An administrator can enable it under System Settings → Module Toggles (turn on <span className="font-medium">Chat</span>).
            Super admins and organization admins always see Chat when they have permission.
          </p>
        </div>
      </div>
    );
  }

  if (!settingsLoaded || loading) {
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
    <div className="space-y-3">
      {apiBanner && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900 shadow-sm"
        >
          <AlertCircle size={18} className="shrink-0 text-red-600 mt-0.5" aria-hidden />
          <p className="flex-1 min-w-0 leading-snug">{apiBanner}</p>
          <button
            type="button"
            onClick={() => setApiBanner(null)}
            className="shrink-0 rounded-md p-1 text-red-600 hover:bg-red-100"
            aria-label="Dismiss alert"
          >
            <X size={16} />
          </button>
        </div>
      )}
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
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Search chats</p>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                  aria-label="Clear chat search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
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
                      <span className="text-[11px] text-gray-400 shrink-0">{formatConversationListTime(conv.lastMessageAt)}</span>
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
              <div className="ml-auto w-64 max-w-[52%]">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search messages..."
                    value={messageSearch}
                    onChange={(e) => setMessageSearch(e.target.value)}
                    className="w-full pl-8 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-colors"
                  />
                  {messageSearch && (
                    <button
                      type="button"
                      onClick={() => setMessageSearch("")}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                      aria-label="Clear message search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                {messageSearch && (
                  <p className="mt-1 text-[10px] text-gray-500">
                    Filtering messages for: <span className="font-medium text-gray-700">{messageSearch}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div ref={messagesScrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-gradient-to-b from-gray-50 to-gray-100/80">
              {loadingMsgs || searchingMessages ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-400">
                    {messageSearch ? "No messages match your search." : "No messages yet. Say hello!"}
                  </p>
                </div>
              ) : (
                <>
                  {hasMoreMessages && !messageSearch && (
                    <div className="flex justify-center pb-2">
                      <button
                        type="button"
                        disabled={loadingOlder}
                        onClick={() => void loadOlderMessages()}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      >
                        {loadingOlder ? "Loading…" : "Load earlier messages"}
                      </button>
                    </div>
                  )}
                  {messages.map((msg, idx) => {
                    const isMe = msg.sender?._id === myId;
                    const showAvatar =
                      !isMe && (idx === 0 || messages[idx - 1]?.sender?._id !== msg.sender?._id);
                    const showName = showAvatar;
                    const prev = idx > 0 ? messages[idx - 1]?.createdAt : undefined;
                    return (
                      <div key={msg._id}>
                        {shouldShowDateSeparator(msg.createdAt, prev) && (
                          <ChatDateSeparator dateStr={msg.createdAt} />
                        )}
                        <div className="py-1">
                          <MessageBubble
                            msg={msg}
                            isMe={isMe}
                            myId={myId ?? ""}
                            showAvatar={showAvatar}
                            showName={showName}
                            otherParticipantIds={otherParticipantIds}
                            onReply={setReplyingTo}
                            onEdit={startEditMessage}
                            onDelete={deleteMessage}
                            onReact={toggleReaction}
                          />
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-gray-200 bg-white">
              {editingMessage && (
                <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-amber-800">Editing message</p>
                    <p className="text-xs text-amber-700/80 truncate">{editingMessage.text}</p>
                  </div>
                  <button
                    type="button"
                    className="text-amber-600 hover:text-amber-900"
                    onClick={() => {
                      setEditingMessage(null);
                      setMsgText("");
                    }}
                    aria-label="Cancel edit"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              {replyingTo && !editingMessage && (
                <div className="mb-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-gray-600">
                      Replying to {replyingTo.sender?.name || "message"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{replyingTo.text}</p>
                  </div>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-700"
                    onClick={() => setReplyingTo(null)}
                    aria-label="Cancel reply"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={editingMessage ? "Edit your message…" : "Type a message… (Enter to send)"}
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage();
                    }
                    if (e.key === "Escape" && editingMessage) {
                      setEditingMessage(null);
                      setMsgText("");
                    }
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!msgText.trim() || sending}
                  className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title={editingMessage ? "Save edit" : "Send"}
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
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
    </div>
  );
}
