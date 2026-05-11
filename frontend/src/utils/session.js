export function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

export function writeStoredUser(user) {
  localStorage.setItem("user", JSON.stringify(user || {}));
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
    localStorage.setItem("user", JSON.stringify(userData));
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

