import { useEffect, useRef, useState, useCallback } from "react";

function parseServerDate(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  // If already has timezone info — parse as-is
  if (/Z$|[+-]\d{2}:\d{2}$/.test(str)) return new Date(str);
  // Laravel timezone is UTC, DB stores UTC without suffix — append Z
  return new Date(str.replace(" ", "T") + "Z");
}

function formatTime(dateStr) {
  const d = parseServerDate(dateStr);
  if (!d || isNaN(d)) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ReadTick({ isRead }) {
  if (isRead) {
    return (
      <span className="chat-tick chat-tick-read" title="تمت القراءة">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="10" viewBox="0 0 16 10" fill="none">
          <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 5l3.5 3.5L15 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    );
  }
  return (
    <span className="chat-tick chat-tick-sent" title="تم الإرسال">
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 12 10" fill="none">
        <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}

function MessageBubble({ msg }) {
  return (
    <div className={`chat-bubble-wrapper ${msg.is_mine ? "mine" : "theirs"}${msg._pending ? " pending" : ""}`}>
      {!msg.is_mine && (
        <span className="chat-bubble-sender">{msg.sender?.name}</span>
      )}
      <div className={`chat-bubble ${msg.is_mine ? "bubble-mine" : "bubble-theirs"}`}>
        <span className="chat-bubble-text" dir="auto">{msg.message}</span>
        <span className="chat-bubble-meta">
          <span className="chat-bubble-time">{formatTime(msg.created_at)}</span>
          {msg.is_mine && (
            msg._pending
              ? <span className="chat-tick chat-tick-pending" title="جارٍ الإرسال...">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                </span>
              : <ReadTick isRead={msg.is_read} />
          )}
        </span>
      </div>
    </div>
  );
}

const NEAR_BOTTOM_THRESHOLD = 120; // px

export default function MessageList({ messages, loading }) {
  const areaRef   = useRef(null);
  const bottomRef = useRef(null);
  const lastCountRef = useRef(0);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const isNearBottom = useCallback(() => {
    const el = areaRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD;
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
    setShowScrollBtn(false);
  }, []);

  // On scroll — show/hide the jump button
  const handleScroll = useCallback(() => {
    setShowScrollBtn(!isNearBottom());
  }, [isNearBottom]);

  // When messages change
  useEffect(() => {
    const newCount = messages.length;
    const added    = newCount - lastCountRef.current;
    lastCountRef.current = newCount;

    if (added <= 0) return; // no new messages (e.g. read-status update)

    const lastMsg = messages[messages.length - 1];
    const isMine  = lastMsg?.is_mine || lastMsg?._pending;

    if (isMine) {
      // Always scroll when I send
      scrollToBottom(true);
    } else if (isNearBottom()) {
      // Scroll only if already near bottom
      scrollToBottom(true);
    } else {
      // Show notification button instead
      setShowScrollBtn(true);
    }
  }, [messages, isNearBottom, scrollToBottom]);

  // Jump to bottom instantly on first load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  if (loading) {
    return (
      <div className="chat-messages-area chat-loading">
        <div className="chat-spinner" />
        <span>جارٍ تحميل الرسائل...</span>
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="chat-messages-area chat-empty">
        <span>لا توجد رسائل بعد. ابدأ المحادثة!</span>
      </div>
    );
  }

  return (
    <div className="chat-messages-area" ref={areaRef} onScroll={handleScroll}>
      {messages.map((msg) => (
        <MessageBubble key={msg.id} msg={msg} />
      ))}
      <div ref={bottomRef} />
      {showScrollBtn && (
        <button className="chat-scroll-btn" onClick={() => scrollToBottom(true)} title="الرسائل الجديدة">
          ↓
        </button>
      )}
    </div>
  );
}
