import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getUsers, deleteUser, changeUserStatus, getRoles } from "../../../services/api";

export default function UsersList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ role_id: "", status: "", search: "" });
  const [sort, setSort] = useState({ sort_by: "created_at", sort_direction: "desc" });

  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 50, // Static page size for better performance
    total: 0,
  });
  const STATIC_PAGE_SIZE = 50; // Fixed page size

  const roleLabels = {
    admin: "مدير النظام",
    student: "طالب",
    teacher: "المعلم المرشد",
    field_supervisor: "مشرف ميداني",
    school_manager: "مدير مدرسة",
    psychology_center_manager: "مدير مركز نفسي",
    adviser: "المرشد التربوي",
    psychologist: "أخصائي نفسي",
    academic_supervisor: "مشرف أكاديمي",
    training_coordinator: "منسق تدريب",
    coordinator: "منسق تدريب",
    education_directorate: "مديرية تربية",
    health_directorate: "وزارة الصحة",
    head_of_department: "رئيس قسم",
  };

  const getRoleLabel = (roleName) => roleLabels[roleName] || roleName || "—";

  const normalizeListResponse = (response) => {
    const nestedData = response?.data?.data;
    const data = Array.isArray(response?.data)
      ? response.data
      : Array.isArray(nestedData)
        ? nestedData
        : [];
    const meta = response?.meta || (Array.isArray(response?.data) ? response : response?.data) || {};

    return { data, meta };
  };

  const fetchRoles = async () => {
    try {
      const response = await getRoles({ per_page: 200 });
      const { data } = normalizeListResponse(response);
      setRoles(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== "")
      );
      const response = await getUsers({
        ...cleanFilters,
        ...sort,
        page,
        per_page: STATIC_PAGE_SIZE,
      });

      const { data: usersArray, meta } = normalizeListResponse(response);

      setUsers(usersArray);
      setPagination({
        current_page: meta.current_page || 1,
        last_page: meta.last_page || 1,
        per_page: STATIC_PAGE_SIZE,
        total: meta.total || 0,
      });
      setError("");
    } catch (err) {
      console.error(err);
      setError("فشل تحميل المستخدمين");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
  }, [filters, sort, location.key]);

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleSort = (sortBy) => {
    setSort((current) => ({
      sort_by: sortBy,
      sort_direction:
        current.sort_by === sortBy && current.sort_direction === "asc" ? "desc" : "asc",
    }));
  };

  const getSortIndicator = (sortBy) => {
    if (sort.sort_by !== sortBy) return "";
    return sort.sort_direction === "asc" ? " ▲" : " ▼";
  };

  const goToPage = (page) => {
    if (page < 1 || page > pagination.last_page) return;
    fetchUsers(page);
  };

  const handleDelete = async (id) => {
    if (window.confirm("هل أنت متأكد من حذف هذا المستخدم؟")) {
      try {
        await deleteUser(id);
        fetchUsers(pagination.current_page);
      } catch (err) {
        alert("حدث خطأ أثناء الحذف");
      }
    }
  };

  const handleStatusChange = async (id, currentStatus) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    try {
      await changeUserStatus(id, newStatus);
      fetchUsers(pagination.current_page);
    } catch (err) {
      alert("حدث خطأ أثناء تغيير الحالة");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active": return <span className="badge-success">نشط</span>;
      case "inactive": return <span className="badge-warning">غير نشط</span>;
      case "suspended": return <span className="badge-danger">موقوف</span>;
      default: return <span>{status}</span>;
    }
  };

  const getEditPath = (user) => {
    const roleName = user.role?.name?.toLowerCase() || "";
    switch (roleName) {
      case "student": return `/admin/users/edit/student/${user.id}`;
      case "admin": return `/admin/users/edit/admin/${user.id}`;
      case "teacher": return `/admin/users/edit/teacher/${user.id}`;
      case "school_manager": return `/admin/users/edit/schoolmanager/${user.id}`;
      case "adviser": return `/admin/users/edit/counselor/${user.id}`;
      case "psychologist": return `/admin/users/edit/psychologist/${user.id}`;
      case "academic_supervisor": return `/admin/users/edit/academic-supervisor/${user.id}`;
      default: return `/admin/users/edit/student/${user.id}`;
    }
  };

  if (loading) return <div className="text-center">جاري التحميل...</div>;
  if (error) return <div className="text-danger">{error}</div>;

  return (
    <div className="users-list">
      <div className="page-header">
        <h1>إدارة المستخدمين</h1>
        <div className="add-buttons-group">
          <button onClick={() => navigate("/admin/users/add/student")} className="btn-add-student">+ إضافة طالب</button>
          <button onClick={() => navigate("/admin/users/add/schoolmanager")} className="btn-add-admin">+ إضافة مدير مدرسة</button>
          <button onClick={() => navigate("/admin/users/add/teacher")} className="btn-add-teacher">+ إضافة معلم</button>
          <button onClick={() => navigate("/admin/users/add/counselor")} className="btn-add-counselor">+ إضافة مرشد</button>
          <button onClick={() => navigate("/admin/users/add/psychologist")} className="btn-add-psychologist">+ إضافة أخصائي نفسي</button>
          <button onClick={() => navigate("/admin/users/add/academic-supervisor")} className="btn-add-supervisor">+ إضافة مشرف أكاديمي</button>
        </div>
      </div>

      {/* فلاتر البحث */}
      <div className="filters-bar">
        <input
          type="text"
          id="filter-search"
          name="search"
          placeholder="بحث بالاسم أو البريد..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          id="filter-role"
          name="role_id"
          value={filters.role_id}
          onChange={(e) => setFilters({ ...filters, role_id: e.target.value })}
        >
          <option value="">جميع الأدوار</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {getRoleLabel(role.name)}
            </option>
          ))}
        </select>
        <select
          id="filter-status"
          name="status"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">جميع الحالات</option>
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
          <option value="suspended">موقوف</option>
        </select>

        <div style={{ color: "#666", fontSize: "12px" }}>
          عرض {STATIC_PAGE_SIZE} مستخدم لكل صفحة (ثابت)
        </div>
      </div>

      {/* جدول المستخدمين */}
      <table className="data-table">
        <thead>
          <tr>
            <th>
              <button type="button" className="table-sort-button" onClick={() => handleSort("university_id")}>
                المعرف الجامعي{getSortIndicator("university_id")}
              </button>
            </th>
            <th>
              <button type="button" className="table-sort-button" onClick={() => handleSort("name")}>
                الاسم{getSortIndicator("name")}
              </button>
            </th>
            <th>
              <button type="button" className="table-sort-button" onClick={() => handleSort("email")}>
                البريد الإلكتروني{getSortIndicator("email")}
              </button>
            </th>
            <th>
              <button type="button" className="table-sort-button" onClick={() => handleSort("role")}>
                الدور{getSortIndicator("role")}
              </button>
            </th>
            <th>
              <button type="button" className="table-sort-button" onClick={() => handleSort("status")}>
                الحالة{getSortIndicator("status")}
              </button>
            </th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.university_id || "—"}</td>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{getRoleLabel(user.role?.name)}</td>
              <td>{getStatusBadge(user.status)}</td>
              <td>
                <Link to={getEditPath(user)} className="btn-sm">تعديل</Link>
                <button onClick={() => handleStatusChange(user.id, user.status)} className="btn-sm">
                  {user.status === "active" ? "تعليق" : "تفعيل"}
                </button>
                <button onClick={() => handleDelete(user.id)} className="btn-sm danger">حذف</button>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr><td colSpan="6" className="text-center">لا يوجد مستخدمون</td></tr>
          )}
        </tbody>
      </table>

      {/* عناصر التصفح */}
      {pagination.last_page > 1 && (
        <div className="pagination">
          <button
            onClick={() => goToPage(pagination.current_page - 1)}
            disabled={pagination.current_page === 1}
          >
            &laquo; السابق
          </button>
          <span>
            الصفحة {pagination.current_page} من {pagination.last_page}
            (إجمالي {pagination.total} مستخدم)
          </span>
          <button
            onClick={() => goToPage(pagination.current_page + 1)}
            disabled={pagination.current_page === pagination.last_page}
          >
            التالي &raquo;
          </button>
        </div>
      )}
    </div>
  );
}