import ChatSidebar from "../../components/chat/ChatSidebar";
import ChatWindow from "../../components/chat/ChatWindow";
import useChat from "../../hooks/useChat";
import "../../styles/chat.css";

function getCurrentUserId() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export default function ChatPage() {
  const currentUserId = getCurrentUserId();

  const {
    chats,
    activeChat,
    draftUser,
    messages,
    loadingChats,
    loadingMessages,
    sending,
    error,
    lastSendError,
    openChat,
    sendMessage,
    startChatWithUser,
    setError,
  } = useChat();

  const handleSelectChat = (chat) => {
    openChat(chat);
  };

  const handleStartNewChat = (userId) => {
    startChatWithUser(userId);
  };

  return (
    <div className="chat-page-wrapper">
    <div className="chat-page">
      {error && (
        <div className="chat-error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <ChatSidebar
        chats={chats}
        activeChat={activeChat}
        loadingChats={loadingChats}
        currentUserId={currentUserId}
        onSelectChat={handleSelectChat}
        onStartNewChat={handleStartNewChat}
      />

      <ChatWindow
        chat={activeChat}
        draftUser={draftUser}
        messages={messages}
        loadingMessages={loadingMessages}
        sending={sending}
        onSend={sendMessage}
        currentUserId={currentUserId}
        lastError={lastSendError}
      />
    </div>
    </div>
  );
}
