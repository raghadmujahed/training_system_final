import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCourses, deleteCourse } from "../../../services/api";
import { useDepartments } from "../../../hooks/useSharedData";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import PageHeader from "../../../components/common/PageHeader";
import useAppToast from "../../../hooks/useAppToast";

export default function CoursesList() {
  const toast = useAppToast();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { data: departments } = useDepartments();
  const [filterDept, setFilterDept] = useState("");
  const perPage = 10;
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: perPage,
    total: 0,
  });

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
  }, [filterDept]);

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
      <PageHeader title="المساقات" />
      <div className="filters-bar">
        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
          <option value="">جميع الأقسام</option>
          {departments.map(dept => (
            <option key={dept.id} value={dept.id}>{dept.name}</option>
          ))}
        </select>
        <Link to="/admin/courses/create" className="btn-primary">
          + إضافة مساق
        </Link>
      </div>

      <div className="rounded-xl overflow-hidden border border-[#e2e8f0] mb-4">
        <table className="w-full border-collapse text-[0.9rem]">
          <thead>
            <tr className="bg-[#f8fafc]">
              <th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">الكود</th>
              <th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">الاسم</th>
              <th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">الساعات</th>
              <th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">النوع</th>
              <th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">القسم</th>
              <th className="py-3 px-4 text-right font-semibold text-[#475569] border-b border-[#e2e8f0]">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id} className="border-b border-[#e2e8f0] hover:bg-[#f1f5f9]">
                <td className="py-3 px-4">{c.code}</td>
                <td className="py-3 px-4">{c.name}</td>
                <td className="py-3 px-4">{c.credit_hours}</td>
                <td className="py-3 px-4">{c.type_label}</td>
                <td className="py-3 px-4">{c.department?.name || "—"}</td>
                <td className="py-3 px-4">
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
              <tr><td colSpan="6" className="py-6 text-center text-text-faint">لا يوجد مساقات</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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