import { useState } from "react";
import MessageInput from "./MessageInput";
import MessageList from "./MessageList";
import UserProfileModal from "./UserProfileModal";

function getChatName(chat, currentUserId) {
  if (!chat) return "";
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

export default function ChatWindow({ chat, messages, loadingMessages, sending, onSend, currentUserId }) {
  const [profileUser, setProfileUser] = useState(null);

  if (!chat) {
    return (
      <div className="chat-window chat-window-empty">
        <div className="chat-window-placeholder">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="56"
            height="56"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0.3 }}
            className="mb-3"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <p>اختر محادثة لعرض الرسائل</p>
        </div>
      </div>
    );
  }

  const chatName = getChatName(chat, currentUserId);
  const otherParticipant = chat.participants?.find((p) => p.id !== currentUserId);

  return (
    <div className="chat-window">
      <div className="chat-window-header">
        <button
          className="chat-window-header-btn"
          onClick={() => otherParticipant && setProfileUser(otherParticipant)}
          title="عرض الملف الشخصي"
        >
          <div className="chat-window-avatar">
            {chatName.charAt(0).toUpperCase()}
          </div>
          <div className="chat-window-title">
            <span className="chat-window-name">{chatName}</span>
            {otherParticipant?.role && (
              <span className="chat-window-role">{getRoleLabel(otherParticipant.role)}</span>
            )}
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0.4 }}
            className="mr-auto shrink-0"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </button>
      </div>

      <MessageList messages={messages} loading={loadingMessages} />

      <MessageInput onSend={onSend} disabled={false} />

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
