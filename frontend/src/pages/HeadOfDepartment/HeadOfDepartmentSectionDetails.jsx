import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSection, getSectionEnrollments, deleteEnrollment, addStudentToSection, removeStudentFromSection, searchStudentsHeadDepartment } from "../../services/api";
import { ArrowLeft, Users, User, BookOpen, Calendar, GraduationCap, Mail, Phone, Trash2, Plus, Search, X } from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";

export default function HeadOfDepartmentSectionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [section, setSection] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);

  const handleRemoveStudent = async (enrollment) => {
    const studentName = enrollment.user?.name || "الطالب";
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف ${studentName} من هذه الشعبة؟\nسيتم إرسال إشعار للطالب.`
    );
    if (!confirmed) return;

    try {
      setRemovingId(enrollment.id);
      // Try section_students pivot first, then enrollment
      if (enrollment.pivot) {
        await removeStudentFromSection(id, { student_id: enrollment.user?.id || enrollment.id });
      } else {
        await deleteEnrollment(enrollment.id);
      }
      setEnrollments((prev) => prev.filter((e) => e.id !== enrollment.id));
    } catch (err) {
      console.error("Error removing student:", err);
      alert(err?.response?.data?.message || "تعذر حذف الطالب من الشعبة");
    } finally {
      setRemovingId(null);
    }
  };

  const handleStudentSearch = async (query) => {
    setStudentSearch(query);
    if (query.trim().length >= 2) {
      setSearching(true);
      try {
        const response = await searchStudentsHeadDepartment(query);
        setSearchResults(response.data || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleAddStudent = async (student) => {
    try {
      setAddingStudent(true);
      await addStudentToSection(id, { student_id: student.id, status: 'accepted' });
      alert(`تم إضافة ${student.name} للشعبة بنجاح`);
      setStudentSearch("");
      setSearchResults([]);
      setShowAddStudent(false);
      // Refresh data
      const enrollmentsData = await getSectionEnrollments(id);
      setEnrollments(enrollmentsData.data || []);
      // Also refresh section to update counts
      const sectionData = await getSection(id);
      setSection(sectionData);
    } catch (err) {
      alert(err?.response?.data?.message || "حدث خطأ أثناء إضافة الطالب");
    } finally {
      setAddingStudent(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [sectionData, enrollmentsData] = await Promise.all([
          getSection(id),
          getSectionEnrollments(id),
        ]);
        setSection(sectionData);
        setEnrollments(enrollmentsData.data || []);
      } catch (err) {
        console.error("Error fetching section details:", err);
        setError("حدث خطأ أثناء تحميل بيانات الشعبة");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  const getStatusLabel = (status) => {
    const labels = {
      active: "نشط",
      dropped: "منسحب",
      completed: "مكتمل",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      active: "#22c55e",
      dropped: "#ef4444",
      completed: "#3b82f6",
    };
    return colors[status] || "#666";
  };

  if (loading) {
    return (
      <LoadingSpinner size="page" text="جاري التحميل..." />
    );
  }

  if (error || !section) {
    return (
      <div className="enrollments-list">
        <div className="page-header">
          <h1>تفاصيل الشعبة</h1>
          <button onClick={() => navigate("/head-department/sections")} className="btn-secondary">
            <ArrowLeft size={16} />
            رجوع
          </button>
        </div>
        <div className="text-center p-10 text-[#dc3545]">
          {error || "لم يتم العثور على الشعبة"}
        </div>
      </div>
    );
  }

  return (
    <div className="enrollments-list">
      <div className="page-header">
        <div>
          <h1>تفاصيل الشعبة</h1>
          <p>{section.name} - {section.course?.name}</p>
        </div>
        <button onClick={() => navigate("/head-department/sections")} className="btn-secondary">
          <ArrowLeft size={16} />
          رجوع
        </button>
      </div>

      {/* Section Info Card */}
      <div className="section-card mb-6">
        <h2 className="mb-4 flex items-center gap-2">
          <BookOpen size={20} />
          معلومات الشعبة
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          <div>
            <label className="text-[#666] text-sm">المساق</label>
            <p className="font-medium">{section.course?.name}</p>
            <p className="text-xs text-[#888]">{section.course?.code}</p>
          </div>
          <div>
            <label className="text-[#666] text-sm">الفصل الدراسي</label>
            <p className="font-medium">
              {section.semester === "first" ? "الأول" : section.semester === "second" ? "الثاني" : "الصيفي"}
            </p>
          </div>
          <div>
            <label className="text-[#666] text-sm">العام الدراسي</label>
            <p className="font-medium">{section.academic_year}</p>
          </div>
          <div>
            <label className="text-[#666] text-sm">السعة</label>
            <p className="font-medium">{section.capacity} طالب</p>
          </div>
          <div>
            <label className="text-[#666] text-sm">المشرف الأكاديمي</label>
            <p className="font-medium">{section.academic_supervisor?.name || "غير محدد"}</p>
          </div>
          <div>
            <label className="text-[#666] text-sm">عدد المسجلين</label>
            <p className="font-medium text-[#3b82f6]">
              {enrollments.length} / {section.capacity}
            </p>
          </div>
        </div>
      </div>

      {/* Enrolled Students */}
      <div className="section-card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="flex items-center gap-2 m-0">
            <Users size={20} />
            الطلاب المسجلون
          </h2>
          <div className="flex items-center gap-2">
            <span className="bg-[#e7f3ff] text-[#3b82f6] py-1 px-3 rounded-xl text-sm">
              {enrollments.length} طالب
            </span>
            <button
              onClick={() => setShowAddStudent(!showAddStudent)}
              className="btn-primary py-[6px] px-3 text-[13px]"
            >
              <Plus size={14} className="inline mr-1" />
              إضافة طالب
            </button>
          </div>
        </div>

        {/* Add Student Search */}
        {showAddStudent && (
          <div className="mb-4 p-4 bg-[#f8f9fa] rounded-lg relative">
            <div className="flex items-center gap-2 mb-2">
              <label htmlFor="hod-section-add-student-search" className="flex items-center gap-2 flex-1 m-0">
                <Search size={16} className="text-[#666] shrink-0" />
                <input
                  id="hod-section-add-student-search"
                  name="add_student_search"
                  type="text"
                  autoComplete="off"
                  placeholder="ابحث بالاسم أو الرقم الجامعي..."
                  value={studentSearch}
                  onChange={(e) => handleStudentSearch(e.target.value)}
                  className="flex-1 py-2 px-3 rounded border border-[#ddd]"
                />
              </label>
              <button
                onClick={() => { setShowAddStudent(false); setStudentSearch(""); setSearchResults([]); }}
                className="bg-transparent border-none cursor-pointer p-1"
              >
                <X size={16} />
              </button>
            </div>
            {searching && <p className="text-[13px] text-[#666]">جاري البحث...</p>}
            {searchResults.length > 0 && (
              <div className="border border-[#ddd] rounded max-h-[200px] overflow-y-auto">
                {searchResults.map(student => (
                  <div
                    key={student.id}
                    className="py-2 px-3 cursor-pointer border-b border-[#eee] flex justify-between items-center hover:bg-[#f0f0f0]"
                  >
                    <div>
                      <strong>{student.name}</strong>
                      <span className="text-xs text-[#666] mr-2">({student.university_id})</span>
                    </div>
                    <button
                      onClick={() => handleAddStudent(student)}
                      disabled={addingStudent}
                      className="btn-primary py-1 px-[10px] text-xs"
                    >
                      {addingStudent ? "..." : "إضافة"}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {!searching && studentSearch.length >= 2 && searchResults.length === 0 && (
              <p className="text-[13px] text-[#999]">لا توجد نتائج</p>
            )}
          </div>
        )}

        {enrollments.length === 0 ? (
          <div className="text-center p-10 text-[#666]">
            <Users size={48} className="mb-4 opacity-30" />
            <p>لا يوجد طلاب مسجلون في هذه الشعبة</p>
            <button 
              onClick={() => setShowAddStudent(true)}
              className="btn-primary mt-4"
            >
              <Plus size={16} className="inline mr-1" />
              إضافة طالب للشعبة
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {enrollments.map((enrollment) => (
              <div 
                key={enrollment.id}
                className="flex items-center justify-between p-4 border border-[#e5e7eb] rounded-lg bg-white"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#e7f3ff] flex items-center justify-center text-[#3b82f6]">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="font-medium m-0">{enrollment.user?.name}</p>
                    <p className="text-xs text-[#666] m-0">
                      {enrollment.user?.university_id}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {enrollment.user?.email && (
                    <div className="flex items-center gap-1 text-xs text-[#666]">
                      <Mail size={14} />
                      {enrollment.user.email}
                    </div>
                  )}
                  <span className="py-1 px-3 rounded-xl text-xs font-medium" style={{ backgroundColor: getStatusColor(enrollment.status) + "20", color: getStatusColor(enrollment.status) }}>
                    {getStatusLabel(enrollment.status)}
                  </span>
                  <button
                    onClick={() => handleRemoveStudent(enrollment)}
                    disabled={removingId === enrollment.id}
                    title="حذف الطالب من الشعبة"
                    className="flex items-center gap-[6px] py-[6px] px-3 rounded-lg border border-[#fecaca] text-[#dc2626] text-xs font-medium transition-all"
                    style={{
                      backgroundColor: removingId === enrollment.id ? "#fee2e2" : "#fff",
                      cursor: removingId === enrollment.id ? "not-allowed" : "pointer",
                    }}
                    onMouseEnter={(e) => {
                      if (removingId !== enrollment.id) {
                        e.currentTarget.style.backgroundColor = "#fee2e2";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (removingId !== enrollment.id) {
                        e.currentTarget.style.backgroundColor = "#fff";
                      }
                    }}
                  >
                    <Trash2 size={14} />
                    {removingId === enrollment.id ? "جارٍ..." : "حذف"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
