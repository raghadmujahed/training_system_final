import { useCallback, useEffect, useRef, useState } from "react";
import {
  createOrGetChat,
  getChatMessages,
  getChats,
  sendChatMessage,
} from "../services/chatApi";

const POLL_INTERVAL_MS = 4000;
const CHATS_POLL_MS    = 5_000;

const sortMessages = (msgs) =>
  [...msgs].sort((a, b) => {
    const aNum = typeof a.id === 'number' ? a.id : (String(a.id).startsWith('temp') ? Infinity : Number(a.id));
    const bNum = typeof b.id === 'number' ? b.id : (String(b.id).startsWith('temp') ? Infinity : Number(b.id));
    if (aNum !== bNum) return aNum - bNum;
    return String(a.created_at).localeCompare(String(b.created_at));
  });

const sortChats = (chats) =>
  [...chats].sort((a, b) => {
    const ta = a.last_message?.created_at ?? a.created_at ?? "";
    const tb = b.last_message?.created_at ?? b.created_at ?? "";
    return String(tb).localeCompare(String(ta)); // newest first
  });

export default function useChat() {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const pollRef        = useRef(null);
  const sendQueueRef   = useRef(Promise.resolve());
  const activeChatRef  = useRef(null);  // always holds latest activeChat
  const pendingByChatRef = useRef({});  // only pending (unsent) messages per chat

  const fetchChats = useCallback(async (silent = false) => {
    if (!silent) setLoadingChats(true);
    try {
      const data = await getChats();
      setChats((prev) =>
        sortChats(
          data.map((c) => {
            const existing = prev.find((p) => p.id === c.id);
            return existing?._locallyRead ? { ...c, unread_count: 0 } : c;
          })
        )
      );
    } catch (err) {
      if (!silent) setError(err?.response?.data?.message || "فشل تحميل المحادثات");
    } finally {
      if (!silent) setLoadingChats(false);
    }
  }, []);

  const openChat = useCallback(async (chatOrUserId, isUserId = false) => {
    setLoadingMessages(true);
    setError(null);

    try {
      let chat = chatOrUserId;
      if (isUserId) {
        chat = await createOrGetChat(chatOrUserId);
      }

      activeChatRef.current = chat;
      setMessages([]);
      setActiveChat(chat);

      setChats((prev) =>
        prev.map((c) =>
          c.id === chat.id ? { ...c, unread_count: 0, _locallyRead: true } : c
        )
      );

      const msgs = await getChatMessages(chat.id);
      if (activeChatRef.current?.id === chat.id) {
        const pending = pendingByChatRef.current[chat.id] ?? [];
        const merged  = sortMessages([...msgs, ...pending]);
        setMessages(merged);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "فشل فتح المحادثة");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const sendMessage = useCallback((text) => {
    const chat = activeChatRef.current;
    if (!chat || !text.trim()) return;

    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const optimisticMsg = {
      id: tempId,
      message: text.trim(),
      type: "text",
      is_read: false,
      is_mine: true,
      created_at: new Date().toISOString(),
      sender: null,
      _pending: true,
    };

    // Track pending per chat
    pendingByChatRef.current[chat.id] = [
      ...(pendingByChatRef.current[chat.id] ?? []),
      optimisticMsg,
    ];
    if (activeChatRef.current?.id === chat.id) {
      setMessages((prev) => sortMessages([...prev, optimisticMsg]));
    }

    sendQueueRef.current = sendQueueRef.current.then(async () => {
      setSending(true);
      try {
        const msg = await sendChatMessage(chat.id, text.trim());

        // Remove from pending cache (confirmed by server)
        pendingByChatRef.current[chat.id] = (pendingByChatRef.current[chat.id] ?? []).filter(
          (m) => m.id !== tempId
        );
        if (activeChatRef.current?.id === chat.id) {
          setMessages((prev) => sortMessages(prev.map((m) => (m.id === tempId ? msg : m))));
        }

        setChats((prev) =>
          sortChats(
            prev.map((c) =>
              c.id === chat.id
                ? { ...c, last_message: { message: text, created_at: msg.created_at } }
                : c
            )
          )
        );
      } catch (err) {
        // Remove failed from pending
        pendingByChatRef.current[chat.id] = (pendingByChatRef.current[chat.id] ?? []).filter(
          (m) => m.id !== tempId
        );
        if (activeChatRef.current?.id === chat.id) {
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
        }
        setError(err?.response?.data?.message || "فشل إرسال الرسالة");
      } finally {
        setSending(false);
      }
    });
  }, []);

  const startChatWithUser = useCallback(
    async (userId) => {
      await openChat(userId, true);
      await fetchChats();
    },
    [openChat, fetchChats],
  );

  // Poll messages for active chat
  useEffect(() => {
    if (!activeChat) return;

    pollRef.current = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const chat = activeChatRef.current;
      if (!chat) return;
      try {
        const msgs = await getChatMessages(chat.id);
        if (activeChatRef.current?.id !== chat.id) return;
        const pending = pendingByChatRef.current[chat.id] ?? [];
        const merged  = sortMessages([...msgs, ...pending]);
        setMessages(merged);
      } catch {
        // silently ignore
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(pollRef.current);
  }, [activeChat]);

  // Poll chats list — skip the first tick since initial load handles it
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchChats(true);
    }, CHATS_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchChats]);

  // Navbar badge
  useEffect(() => {
    const unreadCount = chats.filter((c) => c.unread_count > 0).length;
    window.dispatchEvent(new CustomEvent("chat:unread-changed", { detail: { count: unreadCount } }));
  }, [chats]);

  // Initial load (runs once; polling above starts after CHATS_POLL_MS)
  useEffect(() => {
    fetchChats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    chats,
    activeChat,
    messages,
    loadingChats,
    loadingMessages,
    sending,
    error,
    fetchChats,
    openChat,
    sendMessage,
    startChatWithUser,
    setError,
  };
}
