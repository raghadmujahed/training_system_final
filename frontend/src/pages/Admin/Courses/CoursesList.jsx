import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCourses, deleteCourse } from "../../../services/api";
import { useDepartments } from "../../../hooks/useSharedData";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import useAppToast from "../../../hooks/useAppToast";

export default function CoursesList() {
  const toast = useAppToast();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { data: departments } = useDepartments();
  const [filterDept, setFilterDept] = useState("");
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });
  const [perPage, setPerPage] = useState(10);

  const fetchCourses = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, per_page: perPage };
      if (filterDept) params.department_id = filterDept;

      const response = await getCourses(params);
      const coursesArray = response.data || [];
      const meta = response.meta || {};
      setCourses(coursesArray);
      setPagination({
        current_page: meta.current_page || 1,
        last_page: meta.last_page || 1,
        per_page: meta.per_page || perPage,
        total: meta.total || 0,
      });
      setError("");
    } catch (err) {
      console.error(err);
      setError("فشل تحميل المساقات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses(1);
  }, [perPage, filterDept]);

  const goToPage = (page) => {
    if (page < 1 || page > pagination.last_page) return;
    fetchCourses(page);
  };

  const handleDelete = async (id) => {
    if (window.confirm("هل أنت متأكد من حذف هذا المساق؟")) {
      try {
        await deleteCourse(id);
        fetchCourses(pagination.current_page);
      } catch (err) {
        toast.error("حدث خطأ أثناء الحذف");
      }
    }
  };

  if (loading) return <LoadingSpinner size="page" text="جاري التحميل..." />;
  if (error) return <div className="text-danger">{error}</div>;

  return (
    <div>
      <div className="page-header">
        <h1>المساقات</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link to="/admin/courses/create" className="btn-primary">
            + إضافة مساق
          </Link>
          <select
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
            style={{ width: "auto" }}
          >
            <option value="10">10 مساقات</option>
            <option value="20">20 مساق</option>
            <option value="50">50 مساق</option>
            <option value="100">100 مساق</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label>فلترة حسب القسم: </label>
        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
          <option value="">الكل</option>
          {departments.map(dept => (
            <option key={dept.id} value={dept.id}>{dept.name}</option>
          ))}
        </select>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>الكود</th>
            <th>الاسم</th>
            <th>الساعات</th>
            <th>النوع</th>
            <th>القسم</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c) => (
            <tr key={c.id}>
              <td>{c.code}</td>
              <td>{c.name}</td>
              <td>{c.credit_hours}</td>
              <td>{c.type_label}</td>
              <td>{c.department?.name || "—"}</td>
              <td>
                <Link to={`/admin/courses/edit/${c.id}`} className="btn-sm">
                  تعديل
                </Link>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="btn-sm danger"
                >
                  حذف
                </button>
              </td>
            </tr>
          ))}
          {courses.length === 0 && (
            <tr><td colSpan="6" className="text-center">لا يوجد مساقات</td>
            </tr>
          )}
        </tbody>
      </table>

      {pagination.last_page > 1 && (
        <div className="pagination">
          <button onClick={() => goToPage(pagination.current_page - 1)} disabled={pagination.current_page === 1}>
            &laquo; السابق
          </button>
          <span>
            الصفحة {pagination.current_page} من {pagination.last_page} (إجمالي {pagination.total} مساق)
          </span>
          <button onClick={() => goToPage(pagination.current_page + 1)} disabled={pagination.current_page === pagination.last_page}>
            التالي &raquo;
          </button>
        </div>
      )}
    </div>
  );
}