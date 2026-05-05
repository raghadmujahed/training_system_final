import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Calendar, Users, BookOpen, Database, FileText } from "lucide-react";
import { getArchivedPeriodDetails } from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const TABLE_LABELS = {
  sections: "الشعب",
  enrollments: "التسجيلات",
  students: "الطلاب",
  training_assignments: "تعيينات التدريب",
  student_portfolios: "ملفات الإنجاز",
  student_eforms: "النماذج الإلكترونية",
  daily_reports: "التقارير اليومية",
  student_evaluations: "تقييمات الطلاب",
  field_evaluations: "التقييمات الميدانية",
  evaluations: "التقييمات",
  student_attendances: "الحضور (الطلاب)",
  attendances: "الحضور",
  supervisor_visits: "زيارات المشرفين",
  training_logs: "سجلات التدريب",
  tasks: "المهام",
  weekly_schedules: "الجداول الأسبوعية",
};

const STATUS_LABELS = {
  active: "نشط",
  dropped: "منسحب",
  completed: "مكتمل",
};

export default function HeadOfDepartmentArchiveDetails() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const academic_year = params.get("academic_year");
  const semester = params.get("semester");
  const archived_period = params.get("archived_period");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getArchivedPeriodDetails({ academic_year, semester, archived_period });
        if (mounted) setData(res);
      } catch (err) {
        if (mounted) setError(err?.response?.data?.message || "فشل في تحميل تفاصيل الفترة");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [academic_year, semester, archived_period]);

  // Group enrollments by course -> section
  const grouped = useMemo(() => {
    if (!data?.enrollments) return {};
    const result = {};
    data.enrollments.forEach((e) => {
      const courseKey = `${e.course_code || "?"} - ${e.course_name || "غير معروف"}`;
      if (!result[courseKey]) result[courseKey] = {};
      const sectionKey = e.section_name || "غير معروف";
      if (!result[courseKey][sectionKey]) result[courseKey][sectionKey] = [];
      result[courseKey][sectionKey].push(e);
    });
    return result;
  }, [data]);

  if (loading) {
    return (
      <LoadingSpinner size="section" text="جاري تحميل التفاصيل..." />
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ background: "#fee", color: "#c00", padding: 16, borderRadius: 8 }}>{error}</div>
        <button onClick={() => navigate("/head-department/archive")} className="btn-secondary" style={{ marginTop: 16 }}>
          العودة للأرشفة
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ padding: 24, maxWidth: 1300, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Calendar size={28} /> تفاصيل الفترة المؤرشفة
          </h1>
          <p style={{ color: "#666", margin: "4px 0 0", fontSize: 16 }}>
            {data.period.academic_year} - {data.period.semester_label}
          </p>
        </div>
        <button onClick={() => navigate("/head-department/archive")} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ArrowRight size={16} /> العودة للأرشفة
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, borderBottom: "2px solid #e5e7eb" }}>
        {[
          { id: "overview", label: "نظرة عامة", icon: Database },
          { id: "sections", label: `الشعب (${data.sections?.length || 0})`, icon: BookOpen },
          { id: "students", label: `الطلاب المسجلون (${data.enrollments?.length || 0})`, icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "10px 16px",
                background: active ? "#3b82f6" : "transparent",
                color: active ? "#fff" : "#374151",
                border: "none",
                borderRadius: "8px 8px 0 0",
                cursor: "pointer",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview tab */}
      {activeTab === "overview" && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <h3 style={{ marginTop: 0 }}>إحصائيات البيانات المؤرشفة</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {Object.entries(data.stats || {}).map(([key, count]) => (
              <div key={key} style={{
                padding: 16,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: count > 0 ? "#f0f9ff" : "#f9fafb",
              }}>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>{TABLE_LABELS[key] || key}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: count > 0 ? "#1e40af" : "#9ca3af" }}>{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sections tab */}
      {activeTab === "sections" && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          {(!data.sections || data.sections.length === 0) ? (
            <p style={{ textAlign: "center", color: "#666", padding: 24 }}>لا توجد شعب مؤرشفة لهذه الفترة.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    <th style={th}>المساق</th>
                    <th style={th}>اسم الشعبة</th>
                    <th style={th}>المشرف الأكاديمي</th>
                    <th style={th}>السعة</th>
                    <th style={th}>عدد المسجلين</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sections.map((s) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={td}>
                        <div style={{ fontWeight: 600 }}>{s.course?.name || "-"}</div>
                        <div style={{ fontSize: 12, color: "#666" }}>{s.course?.code || ""}</div>
                      </td>
                      <td style={td}>{s.name}</td>
                      <td style={td}>{s.academic_supervisor?.name || "غير محدد"}</td>
                      <td style={td}>{s.capacity}</td>
                      <td style={td}>
                        <span style={{
                          background: "#dbeafe",
                          color: "#1e40af",
                          padding: "2px 10px",
                          borderRadius: 999,
                          fontSize: 13,
                          fontWeight: 600,
                        }}>{s.enrollments_count}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Students tab */}
      {activeTab === "students" && (
        <div>
          {Object.keys(grouped).length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 12, padding: 24, textAlign: "center", color: "#666", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              لا توجد تسجيلات مؤرشفة لهذه الفترة.
            </div>
          ) : (
            Object.entries(grouped).map(([courseKey, sections]) => (
              <div key={courseKey} style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", marginBottom: 16 }}>
                <h3 style={{ marginTop: 0, color: "#1e40af", borderBottom: "2px solid #e5e7eb", paddingBottom: 8 }}>
                  <BookOpen size={18} style={{ verticalAlign: "middle", marginLeft: 6 }} />
                  {courseKey}
                </h3>
                {Object.entries(sections).map(([sectionName, students]) => (
                  <div key={sectionName} style={{ marginTop: 16 }}>
                    <h4 style={{ margin: "0 0 8px", color: "#374151", display: "flex", alignItems: "center", gap: 6 }}>
                      شعبة: {sectionName}
                      <span style={{ background: "#e5e7eb", color: "#374151", padding: "1px 8px", borderRadius: 999, fontSize: 12 }}>
                        {students.length} طالب
                      </span>
                    </h4>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                          <tr style={{ background: "#f9fafb" }}>
                            <th style={th}>#</th>
                            <th style={th}>الرقم الجامعي</th>
                            <th style={th}>اسم الطالب</th>
                            <th style={th}>البريد</th>
                            <th style={th}>الحالة</th>
                            <th style={th}>التقدير النهائي</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((e, i) => (
                            <tr key={e.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                              <td style={td}>{i + 1}</td>
                              <td style={td}>{e.university_id || "-"}</td>
                              <td style={td}>{e.user_name || "-"}</td>
                              <td style={{ ...td, fontSize: 13, color: "#666" }}>{e.email || "-"}</td>
                              <td style={td}>
                                <span style={{
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  background: e.status === "active" ? "#dcfce7" : e.status === "completed" ? "#dbeafe" : "#fee2e2",
                                  color: e.status === "active" ? "#166534" : e.status === "completed" ? "#1e40af" : "#991b1b",
                                }}>
                                  {STATUS_LABELS[e.status] || e.status}
                                </span>
                              </td>
                              <td style={td}>{e.final_grade ?? "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const th = { padding: 12, textAlign: "right", borderBottom: "2px solid #e5e7eb", fontWeight: 600, fontSize: 13 };
const td = { padding: 10, textAlign: "right" };
