import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getRole, createRole, updateRole, getPermissions } from "../../../services/api";

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
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [roleName, setRoleName] = useState("");
  const [grantedPermissions, setGrantedPermissions] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // جلب جميع الصلاحيات أولاً
        const permsRes = await getPermissions();
        // Handle paginated response - extract data from data.data if it exists
        const allPerms = permsRes.data?.data || permsRes.data || permsRes || [];

        if (id) {
          // جلب بيانات الدور مع صلاحياته
          const roleData = await getRole(id);
          setRoleName(roleData.name || "");

          // استخراج الصلاحيات الممنوحة (قد تأتي بصيغ مختلفة حسب API)
          let permsArray = [];
          if (roleData.permissions) {
            permsArray = Array.isArray(roleData.permissions) 
              ? roleData.permissions 
              : (roleData.permissions.data || []);
          } else if (roleData.role_permissions) {
            permsArray = roleData.role_permissions;
          }

          // فصل الصلاحيات إلى ممنوحة وغير ممنوحة
          const grantedIds = permsArray.map(p => p.id);
          const granted = allPerms.filter(p => grantedIds.includes(p.id));
          const available = allPerms.filter(p => !grantedIds.includes(p.id));
          
          setGrantedPermissions(granted);
          setAvailablePermissions(available);
        } else {
          // في حالة الإضافة، كل الصلاحيات متاحة
          setAvailablePermissions(allPerms);
          setGrantedPermissions([]);
        }
      } catch (err) {
        console.error("خطأ في جلب البيانات:", err);
      }
    };
    fetchData();
  }, [id]);

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
    setLoading(true);
    setErrors({});

    try {
      if (id) {
        // تحديث الدور مع الصلاحيات
        await updateRole(id, { 
          name: roleName,
          permissions: grantedPermissions.map(p => p.id)
        });
      } else {
        await createRole({
          name: roleName,
          permissions: grantedPermissions.map(p => p.id),
        });
      }
      navigate("/admin/roles");
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        alert("حدث خطأ أثناء حفظ الدور");
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