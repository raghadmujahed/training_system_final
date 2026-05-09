import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteCourse, archiveCourse } from "../../services/api";
import { apiCache } from "../../services/apiCache";
import { useCourses } from "../../hooks/useSharedData";
import { Plus, Edit, Trash2, BookOpen, Archive, GraduationCap } from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import useAppToast from "../../hooks/useAppToast";
import PageHeader from "../../components/common/PageHeader";

export default function HeadOfDepartmentCoursesList() {
  const toast = useAppToast();
  const navigate = useNavigate();
  const { data: cachedCourses, loading, error } = useCourses();
  const [removedIds, setRemovedIds] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [archiveLoading, setArchiveLoading] = useState(null);

  const courses = cachedCourses.filter((c) => !removedIds.includes(c.id));

  const fetchCourses = () => {
    apiCache.invalidatePrefix("courses:");
    window.location.reload();
  };

  const handleDelete = async (id, hasSections) => {
    if (hasSections) {
      toast.warning("لا يمكن حذف هذا المساق لأنه مرتبط بشعب. استخدم خيار الأرشفة بدلاً من الحذف.");
      return;
    }
    
    if (!window.confirm("هل أنت متأكد من حذف هذا المساق؟")) {
      return;
    }

    try {
      setDeleteLoading(id);
      await deleteCourse(id);
      setRemovedIds((prev) => [...prev, id]);
      apiCache.invalidatePrefix("courses:");
    } catch (err) {
      console.error("Error deleting course:", err);
      // If 403 error, suggest archiving
      if (err.response?.status === 403) {
        const course = courses.find(c => c.id === id);
        if (course && (course.sections_count > 0 || course.sections?.length > 0)) {
          toast.warning("لا يمكن حذف هذا المساق لأنه مرتبط بشعب. استخدم خيار الأرشفة بدلاً من الحذف.");
          return;
        }
      }
      toast.apiError(err, "فشل في حذف المساق");
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
      setRemovedIds((prev) => [...prev, id]);
      apiCache.invalidatePrefix("courses:");
    } catch (err) {
      console.error("Error archiving course:", err);
      toast.apiError(err, "فشل في أرشفة المساق");
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
          className="bg-[#fee] text-[#c33] p-4 rounded-lg mb-4"
        >
          {error}
          <button
            onClick={fetchCourses}
            className="mr-3 py-[6px] px-3 bg-[#c33] text-white border-none rounded cursor-pointer"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <PageHeader
        title="إدارة المساقات"
        subtitle="عرض وإدارة مساقات القسم الدراسية"
        icon={GraduationCap}
      />

      <div className="flex justify-end mb-4">
        <button
          className="btn btn-primary flex items-center gap-2"
          onClick={() => navigate("/head-department/courses/create")}
        >
          <Plus size={18} />
          إضافة مساق جديد
        </button>
      </div>

      {courses.length === 0 ? (
        <div
          className="text-center p-10 bg-[#f9f9f9] rounded-lg text-[#666]"
        >
          <BookOpen size={48} className="mb-4 opacity-50" />
          <p>لا يوجد مساقات في قسمك حالياً</p>
          <button
            onClick={() => navigate("/head-department/courses/create")}
            className="btn btn-primary mt-4"
          >
            إضافة مساق جديد
          </button>
        </div>
      ) : (
        <div
          className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4"
        >
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white border border-[#e0e0e0] rounded-lg p-4"
            >
              <div
                className="flex justify-between items-start mb-3"
              >
                <div className="flex-1">
                  <h3 className="m-0 mb-2">{course.name}</h3>
                  <p
                    className="m-0 text-[#666] text-sm"
                  >
                    كود المساق: {course.code || "غير محدد"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      navigate(`/head-department/courses/edit/${course.id}`)
                    }
                    className="p-2 bg-[#e3f2fd] border-none rounded cursor-pointer"
                  >
                    <Edit size={16} className="text-[#1976d2]" />
                  </button>
                  {course.sections_count > 0 || course.sections?.length > 0 ? (
                    <button
                      onClick={() => handleArchive(course.id)}
                      disabled={archiveLoading === course.id}
                      className="p-2 bg-[#fff3e0] border-none rounded cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Archive size={16} className="text-[#f57c00]" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDelete(course.id, false)}
                      disabled={deleteLoading === course.id}
                      className="p-2 bg-[#ffebee] border-none rounded cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Trash2 size={16} className="text-[#d32f2f]" />
                    </button>
                  )}
                </div>
              </div>

              <div
                className="flex gap-3 mt-4 pt-3 border-t border-[#f0f0f0]"
              >
                <div className="text-[13px] text-[#666]">
                  <strong>الساعات الجامعية:</strong> {course.credit_hours || "-"}
                </div>
                <div className="text-[13px] text-[#666]">
                  <strong>الساعات التدريبية:</strong> {course.training_hours || "-"}
                </div>
                <div className="text-[13px] text-[#666]">
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
