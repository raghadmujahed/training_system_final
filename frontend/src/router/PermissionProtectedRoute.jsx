import { Navigate } from "react-router-dom";
import { readStoredUser } from "../utils/session";

/**
 * Route protector that checks both authentication and permission.
 * If user doesn't have the required permission, redirects to Unauthorized page.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The component to render if authorized
 * @param {string} props.permission - The required permission name (e.g., 'manage_users')
 * @param {boolean} [props.requireAuth=true] - Whether authentication is required
 */
export default function PermissionProtectedRoute({
  children,
  permission,
  requireAuth = true,
}) {
  const user = readStoredUser();

  // Check authentication
  if (requireAuth && !user?.id) {
    return <Navigate to="/" replace />;
  }

  // If no specific permission required, just check auth
  if (!permission) {
    return children;
  }

  // Check if user has the required permission
  const userPermissions = user?.role?.permissions || [];
  const hasPermission = userPermissions.some(
    (p) => p.name === permission || p === permission
  );

  // Admin role bypass (if user is admin, they have all permissions)
  const isAdmin = user?.role?.name === "admin";

  if (!hasPermission && !isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
