import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSections, deleteSection } from "../../services/api";
import { Edit, Trash2, Plus, Users, Calendar, BookOpen, GraduationCap, Eye } from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import useAppToast from "../../hooks/useAppToast";

export default function HeadOfDepartmentSectionsList() {
  const toast = useAppToast();
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getSections();
      const sectionsData = response?.data || response || [];
      
      // Group sections by academic_year and semester
      const grouped = groupSectionsByPeriod(sectionsData);
      setSections(grouped);
    } catch (err) {
      setError("فشل في جلب بيانات الشعب");
      console.error("Sections fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const groupSectionsByPeriod = (sectionsData) => {
    const grouped = {};
    
    sectionsData.forEach(section => {
      const key = `${section.academic_year}-${section.semester}`;
      if (!grouped[key]) {
        grouped[key] = {
          academic_year: section.academic_year,
          semester: section.semester,
          semester_label: getSemesterLabel(section.semester),
          sections: []
        };
      }
      grouped[key].sections.push(section);
    });

    // Sort by academic year (descending) then by semester order
    return Object.values(grouped).sort((a, b) => {
      if (b.academic_year !== a.academic_year) {
        return b.academic_year - a.academic_year;
      }
      return getSemesterOrder(a.semester) - getSemesterOrder(b.semester);
    });
  };

  const getSemesterLabel = (semester) => {
    const labels = {
      first: "الفصل الأول",
      second: "الفصل الثاني",
      summer: "الفصل الصيفي"
    };
    return labels[semester] || semester;
  };

  const getSemesterOrder = (semester) => {
    const order = { first: 1, second: 2, summer: 3 };
    return order[semester] || 0;
  };

  const handleDelete = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الشعبة؟")) return;
    
    try {
      setDeleteLoading(id);
      await deleteSection(id);
      await fetchSections();
    } catch {
      toast.error("فشل في حذف الشعبة");
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleEdit = (id) => {
    navigate(`/head-department/sections/edit/${id}`);
  };

  const handleView = (id) => {
    navigate(`/head-department/sections/${id}`);
  };

  const handleAdd = () => {
    navigate("/head-department/sections/create");
  };

  if (loading) {
    return (
      <LoadingSpinner size="page" text="جاري التحميل..." />
    );
  }

  if (error) {
    return (
      <div className="enrollments-list">
        <div className="page-header">
          <h1>إدارة الشعب</h1>
          <p>عرض وإدارة الشعب الدراسية</p>
        </div>
        <div className="text-center p-10 text-[#dc3545]">{error}</div>
      </div>
    );
  }

  return (
    <div className="enrollments-list">
      <div className="page-header">
        <div>
          <h1>إدارة الشعب</h1>
          <p>عرض وإدارة الشعب الدراسية حسب الفصل الدراسي</p>
        </div>
        <button onClick={handleAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          إضافة شعبة جديدة
        </button>
      </div>

      {sections.length === 0 ? (
        <div className="section-card text-center p-10">
          <p className="text-[#666] mb-4">لا توجد شعب مسجلة</p>
          <button onClick={handleAdd} className="btn-primary">
            إضافة شعبة جديدة
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {sections.map((period) => (
            <div key={`${period.academic_year}-${period.semester}`} className="section-card">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-[#e5e7eb]">
                <Calendar size={20} className="text-[#3b82f6]" />
                <h3 className="m-0 text-lg">
                  {period.semester_label} - العام الدراسي {period.academic_year}
                </h3>
                <span className="bg-[#e7f3ff] text-[#3b82f6] py-1 px-3 rounded-xl text-[13px]">
                  {period.sections.length} شعبة
                </span>
              </div>

              <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
                {period.sections.map((section) => (
                  <div 
                    key={section.id} 
                    className="border border-[#e5e7eb] rounded-lg p-4 bg-[#f9fafb]"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="m-0 text-base">{section.name}</h4>
                        <span className="text-[13px] text-[#666]">
                          {section.course?.name || "—"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleView(section.id)}
                          className="p-[6px] border-none bg-[#f0fdf4] rounded cursor-pointer flex items-center"
                          title="عرض التفاصيل"
                        >
                          <Eye size={14} className="text-[#16a34a]" />
                        </button>
                        <button
                          onClick={() => handleEdit(section.id)}
                          className="p-[6px] border-none bg-[#e7f3ff] rounded cursor-pointer flex items-center"
                          title="تعديل"
                        >
                          <Edit size={14} className="text-[#3b82f6]" />
                        </button>
                        <button
                          onClick={() => handleDelete(section.id)}
                          className="p-[6px] border-none bg-[#fee2e2] rounded cursor-pointer flex items-center"
                          title="حذف"
                          disabled={deleteLoading === section.id}
                        >
                          {deleteLoading === section.id ? (
                            <span className="text-xs">...</span>
                          ) : (
                            <Trash2 size={14} className="text-[#dc2626]" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        <GraduationCap size={14} className="text-[#666]" />
                        <span className="text-[#666]">
                          المشرف: {section.academic_supervisor?.name || "غير محدد"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Users size={14} className="text-[#666]" />
                        <span className="text-[#666]">
                          الطلاب: {section.active_students_count || 0} / {section.capacity || 30}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <BookOpen size={14} className="text-[#666]" />
                        <span className="text-[#666]">
                          السعة المتاحة: {section.available_capacity || (section.capacity || 30) - (section.active_students_count || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar for capacity */}
                    <div className="mt-3">
                      <div className="h-[6px] bg-[#e5e7eb] rounded-[3px] overflow-hidden">
                        <div className="h-full transition-[width] duration-300 ease" style={{
                          width: `${Math.min(100, ((section.active_students_count || 0) / (section.capacity || 30)) * 100)}%`,
                          backgroundColor: ((section.active_students_count || 0) / (section.capacity || 30)) > 0.9 ? "#dc2626" : "#10b981",
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
