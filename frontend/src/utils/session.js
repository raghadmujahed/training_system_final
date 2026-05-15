import { resolveAvatarUrl } from "./avatarUrl";

function withResolvedAvatar(user) {
  if (!user || typeof user !== "object") return user;
  if (!user.avatar_url) return user;
  return { ...user, avatar_url: resolveAvatarUrl(user.avatar_url) };
}

export function readStoredUser() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return withResolvedAvatar(user);
  } catch {
    return {};
  }
}

const USER_UPDATED = "user-updated";

function dispatchUserUpdated(user) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(USER_UPDATED, { detail: user || {} }));
}

export function writeStoredUser(user) {
  const payload = withResolvedAvatar(user || {});
  localStorage.setItem("user", JSON.stringify(payload));
  dispatchUserUpdated(payload);
}

export function clearStoredUser() {
  localStorage.removeItem("user");
}

export function readStoredToken() {
  return localStorage.getItem("access_token");
}

export function clearStoredToken() {
  localStorage.removeItem("access_token");
}

/**
 * Refresh stored user data with new data from API
 * @param {Object} userData - The fresh user data from API
 */
export function refreshStoredUser(userData) {
  if (userData) {
    const payload = withResolvedAvatar(userData);
    localStorage.setItem("user", JSON.stringify(payload));
    dispatchUserUpdated(payload);
  }
}

/**
 * Update only the role permissions in stored user data
 * @param {Array} permissions - The new permissions array
 */
export function updateStoredUserPermissions(permissions) {
  try {
    const user = readStoredUser();
    if (user && user.role) {
      user.role.permissions = permissions;
      writeStoredUser(user);
    }
  } catch (e) {
    console.error("Failed to update stored user permissions:", e);
  }
}

