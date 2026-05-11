import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSections, deleteSection, getUsers, getCourses } from "../../../services/api";
import { useDepartments } from "../../../hooks/useSharedData";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import useAppToast from "../../../hooks/useAppToast";

export default function SectionsList() {
  const toast = useAppToast();
  const [sections, setSections] = useState([]);
  const [courses, setCourses] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const { data: departments } = useDepartments();

  // New filters: department and academic supervisor only
  const [filters, setFilters] = useState({
    department_id: "",
    academic_supervisor_id: ""
  });

  useEffect(() => {
    fetchCourses();
    fetchSupervisors();
    fetchSections();
  }, []);

  useEffect(() => {
    fetchSections();
  }, [filters]);

  const fetchCourses = async () => {
    try {
      const res = await getCourses({ per_page: 100 });
      setCourses(res.data || []);
    } catch (err) {
      console.error("Error fetching courses:", err);
    }
  };

  const fetchSupervisors = async () => {
    try {
      // Fetch users with academic_supervisor role
      const res = await getUsers({ role: 'academic_supervisor', per_page: 200 });
      setSupervisors(res.data || []);
    } catch (err) {
      console.error("Error fetching supervisors:", err);
    }
  };

  const fetchSections = async () => {
    setLoading(true);
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== "")
      );
      const res = await getSections(cleanFilters);
      setSections(res.data.data || res.data || []);
    } catch (err) {
      console.error("Error fetching sections:", err);
      toast.error("حدث خطأ أثناء جلب الشعب");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("هل أنت متأكد من حذف هذه الشعبة؟")) {
      try {
        await deleteSection(id);
        toast.success("تم حذف الشعبة بنجاح");
        fetchSections();
      } catch (err) {
        toast.apiError(err, "حدث خطأ أثناء حذف الشعبة");
      }
    }
  };

  const handleResetFilters = () => {
    setFilters({
      department_id: "",
      academic_supervisor_id: ""
    });
  };

  const hasActiveFilters = filters.department_id || filters.academic_supervisor_id;

  if (loading) return <LoadingSpinner size="page" text="جاري التحميل..." />;

  return (
    <div>
      <div className="page-header">
        <h1>إدارة الشعب</h1>
        <div className="flex gap-2.5">
          <Link to="/admin/sections/create" className="btn-primary">
            + إضافة شعبة
          </Link>

          <Link to="/admin/sections/add-students-bulk" className="btn-secondary">
             إضافة طلاب إلى شعب
          </Link>
        </div>
      </div>

      {/* Filters - Department and Academic Supervisor only */}
      <div className="filters-bar" style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={filters.department_id}
          onChange={(e) => setFilters({ ...filters, department_id: e.target.value })}
          style={{ minWidth: '180px' }}
        >
          <option value="">جميع الأقسام</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>

        <select
          value={filters.academic_supervisor_id}
          onChange={(e) => setFilters({ ...filters, academic_supervisor_id: e.target.value })}
          style={{ minWidth: '200px' }}
        >
          <option value="">جميع المشرفين الأكاديميين</option>
          {supervisors.map((supervisor) => (
            <option key={supervisor.id} value={supervisor.id}>
              {supervisor.name}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={handleResetFilters}
            className="btn-secondary"
            type="button"
          >
            إعادة تعيين
          </button>
        )}
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>اسم الشعبة</th>
            <th>المساق</th>
            <th>القسم</th>
            <th>المشرف الأكاديمي</th>
            <th>عدد الطلاب</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => (
            <tr key={section.id}>
              <td>{section.name}</td>
              <td>{section.course?.name || "—"}</td>
              <td>{section.course?.department?.name || "—"}</td>
              <td>{section.academic_supervisor?.name || "—"}</td>
              <td>{section.enrollments_count || 0}</td>
              <td>
                <Link to={`/admin/sections/edit/${section.id}`} className="btn-sm">
                  تعديل
                </Link>
                <Link
                  to={`/admin/sections/add-students-bulk?sectionId=${section.id}`}
                  className="btn-sm bg-[#28a745] mx-1.5"
                >
                  إضافة طلاب
                </Link>
                <button onClick={() => handleDelete(section.id)} className="btn-sm danger">
                  حذف
                </button>
               </td>
             </tr>
          ))}
          {sections.length === 0 && (
            <tr>
              <td colSpan="6" className="text-center py-4">
                {hasActiveFilters ? (
                  <div className="text-gray-500">
                    <p className="mb-2">لا توجد شعب مطابقة للفلاتر المحددة</p>
                    <button onClick={handleResetFilters} className="btn-secondary btn-sm">
                      إعادة تعيين الفلاتر
                    </button>
                  </div>
                ) : (
                  <p>لا توجد شعب</p>
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}