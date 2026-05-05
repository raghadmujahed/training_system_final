import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRoles } from "../../../services/api";
import LoadingSpinner from "../../../components/common/LoadingSpinner";

export default function RolesList() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchRoles(); }, []);

  const fetchRoles = async () => {
    try {
      const data = await getRoles();
      setRoles(data.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

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