import { Navigate } from "react-router-dom";
import { readStoredUser } from "../utils/session";
import { getDashboardPathByRole, normalizeRole, ROLES } from "../utils/roles";

/**
 * يقيّد مسارات المشرف الميداني على واجهة /field-supervisor فقط.
 */
export default function FieldSupervisorRoute({ children }) {
  const user = readStoredUser();
  const role = normalizeRole(user?.role?.name ?? user?.role);
  if (role !== ROLES.FIELD_SUPERVISOR) {
    const fallback = getDashboardPathByRole(role) || "/";
    return <Navigate to={fallback} replace />;
  }
  return children;
}
