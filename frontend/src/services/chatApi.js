import { apiClient } from "./api";

// ==================== Chat API ====================

export const getChatAllowedUsers = () =>
  apiClient.get("/chat/allowed-users").then((res) => res.data?.data ?? []);

export const getChats = () =>
  apiClient.get("/chats").then((res) => res.data?.data ?? []);

export const createOrGetChat = (userId) =>
  apiClient.post("/chats/create-or-get", { user_id: userId }).then((res) => res.data?.data);

export const getChatMessages = (chatId) =>
  apiClient.get(`/chats/${chatId}/messages`).then((res) => res.data?.data ?? []);

export const sendChatMessage = (chatId, message, type = "text") =>
  apiClient.post("/messages", { chat_id: chatId, message, type }).then((res) => res.data?.data);

export const getChatUserProfile = (userId) =>
  apiClient.get(`/chat/user-profile/${userId}`).then((res) => res.data?.data);

export const getChatUnreadCount = () =>
  apiClient.get("/chat/unread-count").then((res) => res.data?.unread_count ?? 0);
