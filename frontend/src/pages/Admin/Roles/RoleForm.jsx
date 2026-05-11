import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getRole, createRole, updateRole, refreshCurrentUser } from "../../../services/api";
import { usePermissions } from "../../../hooks/useSharedData";
import useAppToast from "../../../hooks/useAppToast";
import { apiCache } from "../../../services/apiCache";

// ترجمة أسماء الصلاحيات
const permissionTranslations = {
  manage_users: "إدارة المستخدمين",
  manage_roles: "إدارة الأدوار والصلاحيات",
  manage_departments: "إدارة الأقسام",
  manage_training_sites: "إدارة مواقع التدريب",
  manage_training_periods: "إدارة فترات التدريب",
  manage_training_requests: "إدارة طلبات التدريب",
  approve_training_requests: "الموافقة على طلبات التدريب",
  reject_training_requests: "رفض طلبات التدريب",
  manage_training_assignments: "إدارة تعيينات التدريب",
  manage_tasks: "إدارة المهام",
  manage_task_submissions: "إدارة تسليمات المهام",
  manage_attendances: "إدارة الحضور",
  manage_evaluations: "إدارة التقييمات",
  manage_evaluation_templates: "إدارة قوالب التقييم",
  manage_announcements: "إدارة الإعلانات",
  view_reports: "عرض التقارير",
};

const translatePermission = (permName) => {
  return permissionTranslations[permName] || permName.replace(/_/g, " ");
};

const groupByModule = (permissions) => {
  return permissions.reduce((acc, perm) => {
    const module = perm.module || "عام";
    if (!acc[module]) acc[module] = [];
    acc[module].push(perm);
    return acc;
  }, {});
};

export default function RoleForm() {
  const toast = useAppToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [roleName, setRoleName] = useState("");
  const [grantedPermissions, setGrantedPermissions] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const { data: allPerms, loading: permsLoading } = usePermissions();

  useEffect(() => {
    if (permsLoading) return;
    const fetchData = async () => {
      try {
        if (id) {
          const roleData = await getRole(id);
          setRoleName(roleData.name || "");
          let permsArray = [];
          if (roleData.permissions) {
            permsArray = Array.isArray(roleData.permissions)
              ? roleData.permissions
              : (roleData.permissions.data || []);
          } else if (roleData.role_permissions) {
            permsArray = roleData.role_permissions;
          }
          const grantedIds = permsArray.map(p => p.id);
          setGrantedPermissions(allPerms.filter(p => grantedIds.includes(p.id)));
          setAvailablePermissions(allPerms.filter(p => !grantedIds.includes(p.id)));
        } else {
          setAvailablePermissions(allPerms);
          setGrantedPermissions([]);
        }
      } catch (err) {
        console.error("خطأ في جلب بيانات الدور:", err);
      }
    };
    fetchData();
  }, [id, allPerms, permsLoading]);

  const addPermission = (perm) => {
    setGrantedPermissions([...grantedPermissions, perm]);
    setAvailablePermissions(availablePermissions.filter(p => p.id !== perm.id));
  };

  const removePermission = (perm) => {
    setAvailablePermissions([...availablePermissions, perm]);
    setGrantedPermissions(grantedPermissions.filter(p => p.id !== perm.id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // Prevent double submission
    setLoading(true);
    setErrors({});

    try {
      const permissionIds = grantedPermissions.map(p => p.id);

      if (id) {
        // تحديث الدور مع الصلاحيات
        await updateRole(id, {
          name: roleName,
          permissions: permissionIds
        });
        toast.success(`تم تحديث الصلاحيات بنجاح. عدد الصلاحيات: ${permissionIds.length}`);
      } else {
        await createRole({
          name: roleName,
          permissions: permissionIds,
        });
        toast.success(`تم إضافة الدور بنجاح مع ${permissionIds.length} صلاحية`);
      }
      // Invalidate roles cache to refresh permissions count
      apiCache.invalidate("roles:list");
      apiCache.invalidate("roles"); // Invalidate all role-related caches

      // If editing the current user's role, refresh user data to update permissions
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      if (id && currentUser?.role?.id === parseInt(id)) {
        await refreshCurrentUser();
        toast.info("تم تحديث صلاحياتك الشخصية بنجاح");
      }

      navigate("/admin/roles");
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error(err.response?.data?.message || "لا تملك صلاحية تنفيذ هذه العملية");
      } else if (err.response?.status === 422 && err.response?.data?.errors) {
        setErrors(err.response.data.errors);
        toast.error("يرجى تصحيح الأخطاء في النموذج");
      } else {
        toast.apiError(err, "حدث خطأ أثناء حفظ الدور");
      }
    } finally {
      setLoading(false);
    }
  };

  const groupedGranted = groupByModule(grantedPermissions);
  const groupedAvailable = groupByModule(availablePermissions);

  return (
    <div className="role-form">
      <div className="page-header">
        <h1>{id ? `تعديل دور: ${roleName}` : "إضافة دور جديد"}</h1>
        <button onClick={() => navigate("/admin/roles")} className="btn-secondary">رجوع</button>
      </div>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label>اسم الدور *</label>
          <input
            type="text"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            required
          />
          {errors.name && <span className="error">{errors.name[0]}</span>}
        </div>

        {/* الصلاحيات الممنوحة */}
        <div className="form-group">
          <label className="section-label">✅ الصلاحيات الممنوحة لهذا الدور</label>
          {grantedPermissions.length === 0 ? (
            <p className="text-muted">لا توجد صلاحيات ممنوحة حالياً.</p>
          ) : (
            <div className="permissions-list">
              {Object.entries(groupedGranted).map(([module, perms]) => (
                <div key={module} className="permission-module">
                  <h4>{module}</h4>
                  <ol className="permissions-numbers">
                    {perms.map((perm) => (
                      <li key={perm.id}>
                        <span>{translatePermission(perm.name)}</span>
                        <button
                          type="button"
                          className="btn-remove"
                          onClick={() => removePermission(perm)}
                        >
                          إزالة
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* الصلاحيات المتاحة للإضافة */}
        <div className="form-group">
          <label className="section-label">➕ صلاحيات يمكن إضافتها</label>
          {availablePermissions.length === 0 ? (
            <p className="text-muted">جميع الصلاحيات ممنوحة بالفعل.</p>
          ) : (
            <div className="permissions-list">
              {Object.entries(groupedAvailable).map(([module, perms]) => (
                <div key={module} className="permission-module">
                  <h4>{module}</h4>
                  <ol className="permissions-numbers">
                    {perms.map((perm) => (
                      <li key={perm.id}>
                        <span>{translatePermission(perm.name)}</span>
                        <button
                          type="button"
                          className="btn-add"
                          onClick={() => addPermission(perm)}
                        >
                          إضافة
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "جاري الحفظ..." : (id ? "تحديث الصلاحيات" : "إضافة الدور")}
          </button>
          <button type="button" onClick={() => navigate("/admin/roles")} className="btn-secondary">إلغاء</button>
        </div>
      </form>
    </div>
  );
}