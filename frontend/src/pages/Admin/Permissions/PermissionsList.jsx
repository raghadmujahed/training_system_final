import { usePermissions } from "../../../hooks/useSharedData";
import LoadingSpinner from "../../../components/common/LoadingSpinner";

export default function PermissionsList() {
  const { data: permissions, loading, error } = usePermissions();

  if (loading) return <LoadingSpinner size="page" text="جاري التحميل..." />;
  if (error) return <div className="text-danger">فشل تحميل الصلاحيات</div>;

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