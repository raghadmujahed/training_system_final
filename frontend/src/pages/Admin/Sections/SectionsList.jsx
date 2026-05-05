import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSections, deleteSection } from "../../../services/api";
import LoadingSpinner from "../../../components/common/LoadingSpinner";

export default function SectionsList() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      const res = await getSections();
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
        <div style={{ display: "flex", gap: "10px" }}>
          <Link to="/admin/sections/create" className="btn-primary">
            + إضافة شعبة
          </Link>

          <Link to="/admin/sections/add-students-bulk" className="btn-secondary">
             إضافة طلاب إلى شعب
          </Link>
        </div>
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
                  className="btn-sm"
                  style={{ backgroundColor: "#28a745", margin: "0 5px" }}
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