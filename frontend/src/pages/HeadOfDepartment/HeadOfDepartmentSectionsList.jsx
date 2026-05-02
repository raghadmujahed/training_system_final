import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSections, deleteSection } from "../../services/api";
import { Edit, Trash2, Plus, Users, Calendar, BookOpen, GraduationCap, Eye } from "lucide-react";

export default function HeadOfDepartmentSectionsList() {
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
      alert("فشل في حذف الشعبة");
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
      <div className="enrollments-list">
        <div className="page-header">
          <h1>إدارة الشعب</h1>
          <p>عرض وإدارة الشعب الدراسية</p>
        </div>
        <div style={{ textAlign: "center", padding: 40 }}>جاري التحميل...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="enrollments-list">
        <div className="page-header">
          <h1>إدارة الشعب</h1>
          <p>عرض وإدارة الشعب الدراسية</p>
        </div>
        <div style={{ textAlign: "center", padding: 40, color: "#dc3545" }}>{error}</div>
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
        <button onClick={handleAdd} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={16} />
          إضافة شعبة جديدة
        </button>
      </div>

      {sections.length === 0 ? (
        <div className="section-card" style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "#666", marginBottom: 16 }}>لا توجد شعب مسجلة</p>
          <button onClick={handleAdd} className="btn-primary">
            إضافة شعبة جديدة
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {sections.map((period) => (
            <div key={`${period.academic_year}-${period.semester}`} className="section-card">
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 12, 
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: "2px solid #e5e7eb"
              }}>
                <Calendar size={20} style={{ color: "#3b82f6" }} />
                <h3 style={{ margin: 0, fontSize: 18 }}>
                  {period.semester_label} - العام الدراسي {period.academic_year}
                </h3>
                <span style={{ 
                  backgroundColor: "#e7f3ff", 
                  color: "#3b82f6",
                  padding: "4px 12px",
                  borderRadius: 12,
                  fontSize: 13
                }}>
                  {period.sections.length} شعبة
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                {period.sections.map((section) => (
                  <div 
                    key={section.id} 
                    style={{ 
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding: 16,
                      backgroundColor: "#f9fafb"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 16 }}>{section.name}</h4>
                        <span style={{ fontSize: 13, color: "#666" }}>
                          {section.course?.name || "—"}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => handleView(section.id)}
                          style={{ 
                            padding: 6, 
                            border: "none", 
                            background: "#f0fdf4", 
                            borderRadius: 4,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center"
                          }}
                          title="عرض التفاصيل"
                        >
                          <Eye size={14} style={{ color: "#16a34a" }} />
                        </button>
                        <button
                          onClick={() => handleEdit(section.id)}
                          style={{ 
                            padding: 6, 
                            border: "none", 
                            background: "#e7f3ff", 
                            borderRadius: 4,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center"
                          }}
                          title="تعديل"
                        >
                          <Edit size={14} style={{ color: "#3b82f6" }} />
                        </button>
                        <button
                          onClick={() => handleDelete(section.id)}
                          style={{ 
                            padding: 6, 
                            border: "none", 
                            background: "#fee2e2", 
                            borderRadius: 4,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center"
                          }}
                          title="حذف"
                          disabled={deleteLoading === section.id}
                        >
                          {deleteLoading === section.id ? (
                            <span style={{ fontSize: 12 }}>...</span>
                          ) : (
                            <Trash2 size={14} style={{ color: "#dc2626" }} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                        <GraduationCap size={14} style={{ color: "#666" }} />
                        <span style={{ color: "#666" }}>
                          المشرف: {section.academic_supervisor?.name || "غير محدد"}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                        <Users size={14} style={{ color: "#666" }} />
                        <span style={{ color: "#666" }}>
                          الطلاب: {section.active_students_count || 0} / {section.capacity || 30}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                        <BookOpen size={14} style={{ color: "#666" }} />
                        <span style={{ color: "#666" }}>
                          السعة المتاحة: {section.available_capacity || (section.capacity || 30) - (section.active_students_count || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar for capacity */}
                    <div style={{ marginTop: 12 }}>
                      <div style={{ 
                        height: 6, 
                        backgroundColor: "#e5e7eb", 
                        borderRadius: 3,
                        overflow: "hidden"
                      }}>
                        <div style={{ 
                          height: "100%", 
                          width: `${Math.min(100, ((section.active_students_count || 0) / (section.capacity || 30)) * 100)}%`,
                          backgroundColor: ((section.active_students_count || 0) / (section.capacity || 30)) > 0.9 ? "#dc2626" : "#10b981",
                          transition: "width 0.3s ease"
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
