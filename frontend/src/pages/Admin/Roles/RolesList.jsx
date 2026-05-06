import { Link } from "react-router-dom";
import { useRoles } from "../../../hooks/useSharedData";
import LoadingSpinner from "../../../components/common/LoadingSpinner";

export default function RolesList() {
  const { data: roles, loading } = useRoles();

  if (loading) return <LoadingSpinner size="page" text="جاري التحميل..." />;

  return (
    <div>
      <div className="page-header">
        <h1>إدارة الأدوار والصلاحيات</h1>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>اسم الدور</th>
            <th>الصلاحيات</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {roles.map(role => (
            <tr key={role.id}>
              <td>{role.id}</td>
              <td>{role.name}</td>
              <td>
                {role.permissions?.length || 0} صلاحية
              </td>
              <td>
                <Link to={`/admin/roles/edit/${role.id}`} className="btn-sm">
                  تعديل الصلاحيات
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}