import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCourses, deleteCourse, archiveCourse } from "../../services/api";
import { Plus, Edit, Trash2, BookOpen, Archive } from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";

export default function HeadOfDepartmentCoursesList() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [archiveLoading, setArchiveLoading] = useState(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await getCourses();
      // The API returns courses for the authenticated user's department
      setCourses(response.data?.data || response.data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching courses:", err);
      setError("فشل في جلب بيانات المساقات");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, hasSections) => {
    if (hasSections) {
      alert("لا يمكن حذف هذا المساق لأنه مرتبط بشعب. استخدم خيار الأرشفة بدلاً من الحذف.");
      return;
    }
    
    if (!window.confirm("هل أنت متأكد من حذف هذا المساق؟")) {
      return;
    }

    try {
      setDeleteLoading(id);
      await deleteCourse(id);
      setCourses(courses.filter((course) => course.id !== id));
    } catch (err) {
      console.error("Error deleting course:", err);
      // If 403 error, suggest archiving
      if (err.response?.status === 403) {
        const course = courses.find(c => c.id === id);
        if (course && (course.sections_count > 0 || course.sections?.length > 0)) {
          alert("لا يمكن حذف هذا المساق لأنه مرتبط بشعب. استخدم خيار الأرشفة بدلاً من الحذف.");
          return;
        }
      }
      alert(err.response?.data?.message || "فشل في حذف المساق");
    } finally {
      setDeleteLoading(null);
    }
  };
  
  const handleArchive = async (id) => {
    if (!window.confirm("هل أنت متأكد من أرشفة هذا المساق؟\n\nسيصبح المساق غير متاح للاستخدام في المستقبل.")) {
      return;
    }

    try {
      setArchiveLoading(id);
      await archiveCourse(id);
      setCourses(courses.filter((course) => course.id !== id));
    } catch (err) {
      console.error("Error archiving course:", err);
      alert(err.response?.data?.message || "فشل في أرشفة المساق");
    } finally {
      setArchiveLoading(null);
    }
  };

  if (loading) {
    return (
      <LoadingSpinner size="page" text="جاري تحميل المساقات..." />
    );
  }

  if (error) {
    return (
      <div className="container">
        <div
          style={{
            backgroundColor: "#fee",
            color: "#c33",
            padding: 16,
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          {error}
          <button
            onClick={fetchCourses}
            style={{
              marginRight: 12,
              padding: "6px 12px",
              backgroundColor: "#c33",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1>إدارة المساقات</h1>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/head-department/courses/create")}
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <Plus size={18} />
          إضافة مساق جديد
        </button>
      </div>

      {courses.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 40,
            backgroundColor: "#f9f9f9",
            borderRadius: 8,
            color: "#666",
          }}
        >
          <BookOpen size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
          <p>لا يوجد مساقات في قسمك حالياً</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/head-department/courses/create")}
            style={{ marginTop: 16 }}
          >
            إضافة مساق جديد
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          {courses.map((course) => (
            <div
              key={course.id}
              style={{
                backgroundColor: "white",
                border: "1px solid #e0e0e0",
                borderRadius: 8,
                padding: 20,
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, marginBottom: 8 }}>{course.name}</h3>
                  <p
                    style={{
                      margin: 0,
                      color: "#666",
                      fontSize: 14,
                    }}
                  >
                    كود المساق: {course.code || "غير محدد"}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() =>
                      navigate(`/head-department/courses/edit/${course.id}`)
                    }
                    style={{
                      padding: 8,
                      backgroundColor: "#e3f2fd",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      color: "#1976d2",
                    }}
                    title="تعديل"
                  >
                    <Edit size={16} />
                  </button>
                  
                  {course.sections_count > 0 || course.sections?.length > 0 ? (
                    <button
                      onClick={() => handleArchive(course.id)}
                      disabled={archiveLoading === course.id}
                      style={{
                        padding: 8,
                        backgroundColor: "#fff3e0",
                        border: "none",
                        borderRadius: 6,
                        cursor: archiveLoading === course.id ? "not-allowed" : "pointer",
                        color: "#e65100",
                        opacity: archiveLoading === course.id ? 0.6 : 1,
                      }}
                      title="أرشفة (المساق مرتبط بشعب)"
                    >
                      <Archive size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDelete(course.id, false)}
                      disabled={deleteLoading === course.id}
                      style={{
                        padding: 8,
                        backgroundColor: "#ffebee",
                        border: "none",
                        borderRadius: 6,
                        cursor: deleteLoading === course.id ? "not-allowed" : "pointer",
                        color: "#c33",
                        opacity: deleteLoading === course.id ? 0.6 : 1,
                      }}
                      title="حذف"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: "1px solid #f0f0f0",
                }}
              >
                <div style={{ fontSize: 13, color: "#666" }}>
                  <strong>الساعات الجامعية:</strong> {course.credit_hours || "-"}
                </div>
                <div style={{ fontSize: 13, color: "#666" }}>
                  <strong>الساعات التدريبية:</strong> {course.training_hours || "-"}
                </div>
                <div style={{ fontSize: 13, color: "#666" }}>
                  <strong>الشعب:</strong> {course.sections_count || 0}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
