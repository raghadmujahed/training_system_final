import { useCallback, useEffect, useRef, useState } from "react";
import { getChatAllowedUsers } from "../../services/chatApi";
import UserProfileModal from "./UserProfileModal";
import ChatUserAvatar from "./ChatUserAvatar";

function parseServerDate(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  if (/Z$|[+-]\d{2}:\d{2}$/.test(str)) return new Date(str);
  return new Date(str.replace(" ", "T") + "Z");
}

function formatDate(dateStr) {
  const d = parseServerDate(dateStr);
  if (!d || isNaN(d)) return "";
  const now = new Date();
  const diff = now - d;
  if (diff < 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 60_000) return "الآن";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} د`;
  if (diff < 86_400_000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

function getChatDisplayName(chat, currentUserId) {
  const others = chat.participants?.filter((p) => p.id !== currentUserId);
  if (!others?.length) return "محادثة";
  return others.map((p) => p.name).join(", ");
}

const PROFILE_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

export default function ChatSidebar({
  chats,
  activeChat,
  loadingChats,
  currentUserId,
  onSelectChat,
  onStartNewChat,
}) {
  const [tab, setTab] = useState("chats");

  // ── Chats tab state ──────────────────────────────────────────
  const [chatSearch, setChatSearch] = useState("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // ── New tab state ────────────────────────────────────────────
  const [newSearch, setNewSearch] = useState("");
  const [allowedUsers, setAllowedUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState(null);

  const [profileUser, setProfileUser] = useState(null);
  const debounceRef = useRef(null);

  // Load allowed users whenever the "new" tab is opened or search changes (debounced)
  const fetchAllowed = useCallback((query) => {
    setLoadingUsers(true);
    setUsersError(null);
    getChatAllowedUsers(query)
      .then(setAllowedUsers)
      .catch(() => {
        setUsersError("تعذّر تحميل جهات الاتصال");
        setAllowedUsers([]);
      })
      .finally(() => setLoadingUsers(false));
  }, []);

  useEffect(() => {
    if (tab !== "new") return;
    // Initial load (no query)
    fetchAllowed("");
  }, [tab, fetchAllowed]);

  const handleNewSearch = (e) => {
    const val = e.target.value;
    setNewSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchAllowed(val.trim()), 350);
  };

  // ── Filtered chats (client-side) ─────────────────────────────
  const filteredChats = chats.filter((c) => {
    if (showUnreadOnly && !(c.unread_count > 0)) return false;
    if (!chatSearch) return true;
    const name = getChatDisplayName(c, currentUserId).toLowerCase();
    return name.includes(chatSearch.toLowerCase());
  });

  const unreadChatsCount = chats.filter((c) => c.unread_count > 0).length;

  return (
    <div className="chat-sidebar">
      <div className="chat-sidebar-header">
        <h3 className="chat-sidebar-title">الرسائل</h3>
        <div className="chat-sidebar-tabs">
          <button
            className={`chat-tab-btn ${tab === "chats" ? "active" : ""}`}
            onClick={() => { setTab("chats"); }}
          >
            محادثاتي
          </button>
          <button
            className={`chat-tab-btn ${tab === "new" ? "active" : ""}`}
            onClick={() => { setTab("new"); setNewSearch(""); }}
          >
            + جديد
          </button>
        </div>
      </div>

      {/* ── Search bar ─────────────────────────────────────── */}
      <div className="chat-sidebar-search">
        {tab === "chats" ? (
          <input
            type="text"
            placeholder="بحث باسم الشخص..."
            value={chatSearch}
            onChange={(e) => setChatSearch(e.target.value)}
            className="chat-search-input"
          />
        ) : (
          <input
            type="text"
            placeholder="بحث بالاسم أو الرقم الجامعي..."
            value={newSearch}
            onChange={handleNewSearch}
            className="chat-search-input"
          />
        )}
      </div>

      {/* ── Chats tab filter bar ────────────────────────────── */}
      {tab === "chats" && (
        <div className="chat-filter-bar">
          <button
            className={`chat-filter-btn ${showUnreadOnly ? "active" : ""}`}
            onClick={() => setShowUnreadOnly((v) => !v)}
          >
            غير مقروءة
            {unreadChatsCount > 0 && (
              <span className="chat-filter-count">{unreadChatsCount > 99 ? "99+" : unreadChatsCount}</span>
            )}
          </button>
          {showUnreadOnly && (
            <button className="chat-filter-clear" onClick={() => setShowUnreadOnly(false)}>
              الكل
            </button>
          )}
        </div>
      )}

      <div className="chat-sidebar-list">
        {/* ── Chats list ──────────────────────────────────── */}
        {tab === "chats" && (
          <>
            {loadingChats && (
              <div className="chat-sidebar-loading"><div className="chat-spinner" /></div>
            )}
            {!loadingChats && filteredChats.length === 0 && (
              <div className="chat-sidebar-empty">
                {chatSearch ? "لا توجد نتائج مطابقة" : "لا توجد محادثات بعد"}
              </div>
            )}
            {filteredChats.map((chat) => {
              const name = getChatDisplayName(chat, currentUserId);
              const isActive = activeChat?.id === chat.id;
              const otherParticipant = chat.participants?.find((p) => p.id !== currentUserId);
              return (
                <div key={chat.id} className={`chat-sidebar-item-wrap ${isActive ? "active" : ""}`}>
                  <button className="chat-sidebar-item" onClick={() => onSelectChat(chat)}>
                    <ChatUserAvatar
                      className="chat-item-avatar"
                      avatarUrl={otherParticipant?.avatar_url}
                      name={name}
                    >
                      {chat.unread_count > 0 && (
                        <span className="chat-unread-badge">{chat.unread_count}</span>
                      )}
                    </ChatUserAvatar>
                    <div className="chat-item-info">
                      <span className="chat-item-name">{name}</span>
                      <span className="chat-item-preview" dir="auto">
                        {chat.last_message ? (
                          <>
                            {chat.last_message.sender_id === currentUserId ? (
                              <span className="chat-preview-label">أنت: </span>
                            ) : chat.last_message.sender ? (
                              <span className="chat-preview-label">
                                {chat.last_message.sender.split(" ")[0]}:{" "}
                              </span>
                            ) : null}
                            {chat.last_message.message}
                          </>
                        ) : (
                          "ابدأ المحادثة"
                        )}
                      </span>
                    </div>
                    <span className="chat-item-time">
                      {formatDate(chat.last_message?.created_at)}
                    </span>
                  </button>
                  {otherParticipant && (
                    <button
                      className="chat-item-profile-btn"
                      title="عرض الملف الشخصي"
                      onClick={(e) => { e.stopPropagation(); setProfileUser(otherParticipant); }}
                    >
                      {PROFILE_ICON}
                    </button>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* ── New conversation list ────────────────────────── */}
        {tab === "new" && (
          <>
            {loadingUsers && (
              <div className="chat-sidebar-loading"><div className="chat-spinner" /></div>
            )}
            {usersError && !loadingUsers && (
              <div className="chat-sidebar-empty">{usersError}</div>
            )}
            {!loadingUsers && !usersError && allowedUsers.length === 0 && (
              <div className="chat-sidebar-empty">
                {newSearch
                  ? "لا توجد نتائج مطابقة للبحث"
                  : "لا يوجد مستخدمون متاحون للمراسلة حالياً"}
              </div>
            )}
            {!loadingUsers && !usersError && allowedUsers.map((user) => (
              <div key={user.id} className="chat-sidebar-item-wrap">
                <button
                  className="chat-sidebar-item"
                  onClick={() => {
                    if (!user.id) return;
                    onStartNewChat(user.id);
                    setTab("chats");
                    setNewSearch("");
                  }}
                >
                  <ChatUserAvatar
                    className="chat-item-avatar"
                    avatarUrl={user.avatar_url}
                    name={user.name}
                  />
                  <div className="chat-item-info">
                    <span className="chat-item-name">{user.name}</span>
                    <span className="chat-item-preview">
                      {user.role_label || user.role || ""}
                    </span>
                  </div>
                </button>
                <button
                  className="chat-item-profile-btn"
                  title="عرض الملف الشخصي"
                  onClick={(e) => { e.stopPropagation(); setProfileUser(user); }}
                >
                  {PROFILE_ICON}
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {profileUser && (
        <UserProfileModal
          userId={profileUser.id}
          userName={profileUser.name}
          onClose={() => setProfileUser(null)}
        />
      )}
    </div>
  );
}
