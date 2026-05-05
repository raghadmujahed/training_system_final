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
  const pollRef = useRef(null);
  const sendQueueRef = useRef(Promise.resolve()); // sequential send queue

  const fetchChats = useCallback(async (silent = false) => {
    if (!silent) setLoadingChats(true);
    try {
      const data = await getChats();
      // Preserve unread_count=0 for currently open chat
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
    setMessages([]);
    setError(null);

    try {
      let chat = chatOrUserId;
      if (isUserId) {
        chat = await createOrGetChat(chatOrUserId);
      }

      // Zero unread count immediately in the sidebar (optimistic)
      setChats((prev) =>
        prev.map((c) =>
          c.id === chat.id
            ? { ...c, unread_count: 0, _locallyRead: true }
            : c
        )
      );

      setActiveChat(chat);
      const msgs = await getChatMessages(chat.id);
      setMessages(sortMessages(msgs));
    } catch (err) {
      setError(err?.response?.data?.message || "فشل فتح المحادثة");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const sendMessage = useCallback(
    (text) => {
      if (!activeChat || !text.trim()) return;

      // Optimistic: show message immediately with a temporary id
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
      setMessages((prev) => sortMessages([...prev, optimisticMsg]));

      // Queue the actual API call sequentially
      sendQueueRef.current = sendQueueRef.current.then(async () => {
        setSending(true);
        try {
          const msg = await sendChatMessage(activeChat.id, text.trim());
          setMessages((prev) =>
            sortMessages(prev.map((m) => (m.id === tempId ? msg : m)))
          );
          setChats((prev) =>
            sortChats(
              prev.map((c) =>
                c.id === activeChat.id
                  ? { ...c, last_message: { message: text, created_at: msg.created_at } }
                  : c,
              )
            )
          );
        } catch (err) {
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          setError(err?.response?.data?.message || "فشل إرسال الرسالة");
        } finally {
          setSending(false);
        }
      });
    },
    [activeChat],
  );

  const startChatWithUser = useCallback(
    async (userId) => {
      await openChat(userId, true);
      await fetchChats();
    },
    [openChat, fetchChats],
  );

  // Poll for new messages when a chat is active
  useEffect(() => {
    if (!activeChat) return;

    pollRef.current = setInterval(async () => {
      try {
        const msgs = await getChatMessages(activeChat.id);
        setMessages((prev) => {
          const pending = prev.filter((m) => m._pending);
          const merged = sortMessages([...msgs, ...pending]);
          return merged;
        });
      } catch {
        // silently ignore poll errors
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(pollRef.current);
  }, [activeChat]);

  // Poll chats list silently to refresh unread counts from other conversations
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchChats(true);
      }
    }, CHATS_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchChats]);

  // Notify Navbar badge whenever chats unread counts change
  useEffect(() => {
    const unreadCount = chats.filter((c) => c.unread_count > 0).length;
    window.dispatchEvent(new CustomEvent("chat:unread-changed", { detail: { count: unreadCount } }));
  }, [chats]);

  // Initial chats load
  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

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
