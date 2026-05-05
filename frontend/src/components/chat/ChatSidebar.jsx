import { useEffect, useState } from "react";
import { getChatAllowedUsers } from "../../services/chatApi";
import UserProfileModal from "./UserProfileModal";

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

function getRoleLabel(role) {
  const labels = {
    student: "طالب",
    academic_supervisor: "مشرف أكاديمي",
    field_supervisor: "مشرف ميداني",
    training_coordinator: "منسق تدريب",
    head_of_department: "رئيس قسم",
    admin: "مدير النظام",
  };
  return labels[role] || role || "";
}

export default function ChatSidebar({
  chats,
  activeChat,
  loadingChats,
  currentUserId,
  onSelectChat,
  onStartNewChat,
}) {
  const [tab, setTab] = useState("chats");
  const [allowedUsers, setAllowedUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [search, setSearch] = useState("");
  const [profileUser, setProfileUser] = useState(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  useEffect(() => {
    if (tab === "new") {
      setLoadingUsers(true);
      getChatAllowedUsers()
        .then(setAllowedUsers)
        .catch(() => setAllowedUsers([]))
        .finally(() => setLoadingUsers(false));
    }
  }, [tab]);

  const filteredChats = chats.filter((c) => {
    if (showUnreadOnly && !(c.unread_count > 0)) return false;
    if (!search) return true;
    const name = getChatDisplayName(c, currentUserId).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const unreadChatsCount = chats.filter((c) => c.unread_count > 0).length;

  const filteredUsers = allowedUsers.filter((u) => {
    if (!search) return true;
    return u.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="chat-sidebar">
      <div className="chat-sidebar-header">
        <h3 className="chat-sidebar-title">الرسائل</h3>
        <div className="chat-sidebar-tabs">
          <button
            className={`chat-tab-btn ${tab === "chats" ? "active" : ""}`}
            onClick={() => setTab("chats")}
          >
            محادثاتي
          </button>
          <button
            className={`chat-tab-btn ${tab === "new" ? "active" : ""}`}
            onClick={() => setTab("new")}
          >
            + جديد
          </button>
        </div>
      </div>

      <div className="chat-sidebar-search">
        <input
          type="text"
          placeholder={tab === "chats" ? "بحث باسم الشخص..." : "بحث باسم جهة الاتصال..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="chat-search-input"
        />
      </div>

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
        {tab === "chats" && (
          <>
            {loadingChats && (
              <div className="chat-sidebar-loading">
                <div className="chat-spinner" />
              </div>
            )}
            {!loadingChats && filteredChats.length === 0 && (
              <div className="chat-sidebar-empty">لا توجد محادثات بعد</div>
            )}
            {filteredChats.map((chat) => {
              const name = getChatDisplayName(chat, currentUserId);
              const isActive = activeChat?.id === chat.id;
              const otherParticipant = chat.participants?.find((p) => p.id !== currentUserId);
              return (
                <div key={chat.id} className={`chat-sidebar-item-wrap ${isActive ? "active" : ""}`}>
                  <button
                    className="chat-sidebar-item"
                    onClick={() => onSelectChat(chat)}
                  >
                    <div className="chat-item-avatar">
                      {name.charAt(0).toUpperCase()}
                      {chat.unread_count > 0 && (
                        <span className="chat-unread-badge">{chat.unread_count}</span>
                      )}
                    </div>
                    <div className="chat-item-info">
                      <span className="chat-item-name">{name}</span>
                      <span className="chat-item-preview" dir="auto">
                        {chat.last_message
                          ? <>
                              {chat.last_message.sender_id === currentUserId
                                ? <span className="chat-preview-label">أنت: </span>
                                : chat.last_message.sender
                                  ? <span className="chat-preview-label">{chat.last_message.sender.split(" ")[0]}: </span>
                                  : null
                              }
                              {chat.last_message.message}
                            </>
                          : "ابدأ المحادثة"
                        }
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
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </>
        )}

        {tab === "new" && (
          <>
            {loadingUsers && (
              <div className="chat-sidebar-loading">
                <div className="chat-spinner" />
              </div>
            )}
            {!loadingUsers && filteredUsers.length === 0 && (
              <div className="chat-sidebar-empty">لا توجد جهات اتصال متاحة</div>
            )}
            {filteredUsers.map((user) => (
              <div key={user.id} className="chat-sidebar-item-wrap">
                <button
                  className="chat-sidebar-item"
                  onClick={() => {
                    onStartNewChat(user.id);
                    setTab("chats");
                    setSearch("");
                  }}
                >
                  <div className="chat-item-avatar">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="chat-item-info">
                    <span className="chat-item-name">{user.name}</span>
                    <span className="chat-item-preview">{getRoleLabel(user.role)}</span>
                  </div>
                </button>
                <button
                  className="chat-item-profile-btn"
                  title="عرض الملف الشخصي"
                  onClick={(e) => { e.stopPropagation(); setProfileUser(user); }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
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
