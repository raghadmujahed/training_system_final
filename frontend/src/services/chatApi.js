import { apiClient } from "./api";

// ==================== Chat API ====================

export const getChatAllowedUsers = (search = "") =>
  apiClient
    .get("/chat/allowed-users", { params: search ? { search } : {} })
    .then((res) => res.data?.data ?? []);

export const getChats = () =>
  apiClient.get("/chats").then((res) => res.data?.data ?? []);

export const createOrGetChat = (userId) =>
  apiClient.post("/chats/create-or-get", { user_id: userId }).then((res) => res.data);

export const startWithMessage = (userId, message, type = "text") =>
  apiClient.post("/chats/start-with-message", { user_id: userId, message, type }).then((res) => res.data);

export const getChatMessages = (chatId) =>
  apiClient.get(`/chats/${chatId}/messages`).then((res) => res.data?.data ?? []);

export const sendChatMessage = (chatId, message, type = "text") =>
  apiClient.post("/messages", { chat_id: chatId, message, type }).then((res) => res.data?.data);

export const getChatUserProfile = (userId) =>
  apiClient.get(`/chat/user-profile/${userId}`).then((res) => res.data?.data);

export const getChatUnreadCount = () =>
  apiClient.get("/chat/unread-count").then((res) => res.data?.unread_count ?? 0);
