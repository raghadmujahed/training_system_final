import { useEffect, useState } from "react";
import { getPermissions } from "../../../services/api";
import LoadingSpinner from "../../../components/common/LoadingSpinner";

export default function PermissionsList() {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const data = await getPermissions();
        // Handle both paginated and direct array responses
        const permissionsArray = data.data || data || [];
        setPermissions(Array.isArray(permissionsArray) ? permissionsArray : []);
      } catch (err) {
        console.error(err);
        setError("فشل تحميل الصلاحيات");
      } finally {
        setLoading(false);
      }
    };
    fetchPermissions();
  }, []);

  if (loading) return <LoadingSpinner size="page" text="جاري التحميل..." />;
  if (error) return <div className="text-danger">{error}</div>;

  return (
    <div>
      <div className="page-header">
        <h1>قائمة الصلاحيات</h1>
      </div>

      {permissions.length === 0 ? (
        <p>لا توجد صلاحيات حالياً</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>اسم الصلاحية</th>
            </tr>
          </thead>
          <tbody>
            {permissions.map(perm => (
              <tr key={perm.id}>
                <td>{perm.id}</td>
                <td>{perm.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}