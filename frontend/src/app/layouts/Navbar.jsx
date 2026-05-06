import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import NotificationBell from "../../components/common/NotificationBell";
import { getRoleLabel } from "../../utils/roles";
import { readStoredToken, readStoredUser } from "../../utils/session";
import { getChatUnreadCount } from "../../services/chatApi";

const POLL_MS = 10_000;

export default function Navbar({ onMenuClick }) {
  const savedUser = readStoredUser();
  const navigate = useNavigate();
  const location = useLocation();
  const isChatActive = location.pathname === "/chat";

  const [chatUnread, setChatUnread] = useState(0);

  const fetchUnread = useCallback(async () => {
    const token = readStoredToken();
    if (!token || token === "undefined" || token === "null") return;
    try {
      const count = await getChatUnreadCount();
      setChatUnread(count);
    } catch {
      // silently ignore
    }
  }, []);

  // Poll regularly
  useEffect(() => {
    fetchUnread();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchUnread();
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  // Re-fetch only when leaving /chat (to catch messages read while on the chat page)
  const prevPathRef = useRef("/");
  useEffect(() => {
    if (prevPathRef.current === "/chat" && location.pathname !== "/chat") {
      fetchUnread();
    }
    prevPathRef.current = location.pathname;
  }, [location.pathname, fetchUnread]);

  // Instant update when useChat dispatches unread changes (while on /chat)
  useEffect(() => {
    const handler = (e) => setChatUnread(e.detail?.count ?? 0);
    window.addEventListener("chat:unread-changed", handler);
    return () => window.removeEventListener("chat:unread-changed", handler);
  }, []);

  const userName = savedUser?.name || "مستخدم النظام";
  const roleKey = savedUser?.role?.name || savedUser?.role;
  const roleName = getRoleLabel(roleKey);

  return (
    <header className="top-navbar">
      <div className="navbar-right">
        <button className="mobile-menu-btn" onClick={onMenuClick}>
          ☰
        </button>

        <div>
          <h3 className="navbar-title">منصة إدارة التدريب الميداني</h3>
          <p className="navbar-subtitle">
            منصة أكاديمية لمتابعة التدريب العملي والتربوي
          </p>
        </div>
      </div>

      <div className="navbar-left">
        <button
          className={`navbar-chat-btn${isChatActive ? " active" : ""}`}
          onClick={() => navigate("/chat")}
          title="الرسائل"
          aria-label="الرسائل"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {chatUnread > 0 && (
            <span className="navbar-chat-badge">
              {chatUnread > 99 ? "99+" : chatUnread}
            </span>
          )}
        </button>
        <NotificationBell />
        <div className="navbar-chip">
          <span>{userName}</span>
          <span>—</span>
          <span>{roleName}</span>
        </div>
      </div>
    </header>
  );
}
