import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSections, deleteSection, getCourses } from "../../../services/api";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import PageHeader from "../../../components/common/PageHeader";

export default function SectionsList() {
  const [sections, setSections] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    academic_year: "",
    semester: "",
    course_id: ""
  });

  useEffect(() => {
    fetchCourses();
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
      console.error(err);
    }
  };

  const fetchSections = async () => {
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== "")
      );
      const res = await getSections(cleanFilters);
      setSections(res.data.data || res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("هل أنت متأكد من حذف هذه الشعبة؟")) {
      await deleteSection(id);
      fetchSections();
    }
  };

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

      {/* Filters */}
      <div className="filters-bar" style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <select
          value={filters.academic_year}
          onChange={(e) => setFilters({ ...filters, academic_year: e.target.value })}
        >
          <option value="">جميع السنوات</option>
          <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
          <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
          <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
        </select>

        <select
          value={filters.semester}
          onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
        >
          <option value="">جميع الفصول</option>
          <option value="first">الأول</option>
          <option value="second">الثاني</option>
          <option value="summer">الصيفي</option>
        </select>

        <select
          value={filters.course_id}
          onChange={(e) => setFilters({ ...filters, course_id: e.target.value })}
          style={{ minWidth: '200px' }}
        >
          <option value="">جميع المساقات</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>

        <button
          onClick={() => setFilters({ academic_year: "", semester: "", course_id: "" })}
          className="btn-secondary"
        >
          إعادة تعيين
        </button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>اسم الشعبة</th>
            <th>المساق</th>
            <th>السنة الأكاديمية</th>
            <th>الفصل</th>
            <th>المشرف الأكاديمي</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => (
            <tr key={section.id}>
              <td>{section.name}</td>
              <td>{section.course?.name || "—"}</td>
              <td>{section.academic_year}</td>
              <td>{section.semester === "first" ? "الأول" : "الثاني"}</td>
              <td>{section.academic_supervisor?.name || "—"}</td>
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
            <tr><td colSpan="6" className="text-center">لا توجد شعب</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}