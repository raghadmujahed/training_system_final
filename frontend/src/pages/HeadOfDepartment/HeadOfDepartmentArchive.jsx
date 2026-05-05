import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, RefreshCw, AlertTriangle, CheckCircle2, Calendar, Database, Eye } from "lucide-react";
import { getArchivePreview, archiveCurrentPeriod, getArchivedPeriods } from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const SEMESTER_LABELS = {
  first: "الفصل الأول",
  second: "الفصل الثاني",
  summer: "الفصل الصيفي",
};

const TABLE_LABELS = {
  sections: "الشعب",
  enrollments: "التسجيلات",
  training_assignments: "تعيينات التدريب",
  student_portfolios: "ملفات الإنجاز",
  portfolio_entries: "مدخلات الملف",
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
  task_submissions: "تسليمات المهام",
  weekly_schedules: "الجداول الأسبوعية",
  notes: "الملاحظات",
  notifications: "الإشعارات",
  announcements: "الإعلانات",
  official_letters: "طلبات التدريب",
};

export default function HeadOfDepartmentArchive() {
  const navigate = useNavigate();
  const [preview, setPreview] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [previewData, periodsData] = await Promise.all([
        getArchivePreview(),
        getArchivedPeriods(),
      ]);
      setPreview(previewData);
      setPeriods(periodsData?.periods || []);
    } catch (err) {
      console.error("Archive load error:", err);
      setError(err?.response?.data?.message || "فشل في تحميل بيانات الأرشفة");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleArchive = async () => {
    if (!preview?.period) {
      alert("لا توجد فترة تدريبية حالية للأرشفة");
      return;
    }
    const confirmMsg = `سيتم أرشفة بيانات الفترة (${preview.period.academic_year} - ${SEMESTER_LABELS[preview.period.semester] || preview.period.semester}) لقسمك فقط.\n\nهل تريد المتابعة؟`;
    if (!window.confirm(confirmMsg)) return;
    try {
      setArchiving(true);
      const result = await archiveCurrentPeriod();
      alert(result?.message || "تمت الأرشفة بنجاح");
      await loadData();
    } catch (err) {
      console.error("Archive error:", err);
      alert(err?.response?.data?.message || "فشل في الأرشفة");
    } finally {
      setArchiving(false);
    }
  };

  if (loading) {
    return (
      <LoadingSpinner size="section" text="جاري تحميل البيانات..." />
    );
  }

  const totalToArchive = preview?.counts
    ? Object.values(preview.counts).reduce((sum, n) => sum + (n || 0), 0)
    : 0;

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Archive size={28} /> أرشفة البيانات
          </h1>
          <p style={{ color: "#666", margin: "4px 0 0" }}>
            أرشفة بيانات الفترة التدريبية الحالية لقسمك. لا تتم أرشفة المستخدمين أو المساقات أو الأقسام.
          </p>
        </div>
        <button onClick={loadData} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <RefreshCw size={16} /> تحديث
        </button>
      </div>

      {error && (
        <div style={{ background: "#fee", color: "#c00", padding: 16, borderRadius: 8, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={20} /> {error}
        </div>
      )}

      {/* Current period card */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <h2 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <Calendar size={20} /> الفترة الحالية المرشحة للأرشفة
        </h2>

        {preview?.period ? (
          <>
            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
              <div style={{ background: "#eff6ff", padding: "12px 20px", borderRadius: 8, border: "1px solid #bfdbfe" }}>
                <div style={{ fontSize: 12, color: "#666" }}>العام الدراسي</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1e40af" }}>{preview.period.academic_year}</div>
              </div>
              <div style={{ background: "#eff6ff", padding: "12px 20px", borderRadius: 8, border: "1px solid #bfdbfe" }}>
                <div style={{ fontSize: 12, color: "#666" }}>الفصل</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1e40af" }}>
                  {SEMESTER_LABELS[preview.period.semester] || preview.period.semester}
                </div>
              </div>
              <div style={{ background: "#fef3c7", padding: "12px 20px", borderRadius: 8, border: "1px solid #fde68a" }}>
                <div style={{ fontSize: 12, color: "#666" }}>إجمالي العناصر</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#92400e" }}>{totalToArchive}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginBottom: 16 }}>
              {Object.entries(preview.counts || {}).map(([key, count]) => (
                <div key={key} style={{
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  background: count > 0 ? "#fff" : "#f9fafb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  opacity: count > 0 ? 1 : 0.6,
                }}>
                  <span style={{ fontSize: 14 }}>{TABLE_LABELS[key] || key}</span>
                  <span style={{
                    background: count > 0 ? "#3b82f6" : "#9ca3af",
                    color: "#fff",
                    padding: "2px 10px",
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 600,
                  }}>{count}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleArchive}
              disabled={archiving || totalToArchive === 0}
              className="btn-primary"
              style={{
                background: totalToArchive === 0 ? "#9ca3af" : "#f59e0b",
                color: "#fff",
                padding: "12px 24px",
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: archiving || totalToArchive === 0 ? "not-allowed" : "pointer",
              }}
            >
              <Archive size={18} />
              {archiving ? "جاري الأرشفة..." : "أرشفة الفترة الحالية"}
            </button>
          </>
        ) : (
          <p style={{ color: "#666" }}>{preview?.message || "لا توجد فترة تدريبية حالية للأرشفة في قسمك."}</p>
        )}
      </div>

      {/* Archived periods list */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <h2 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <Database size={20} /> الفترات المؤرشفة ({periods.length})
        </h2>

        {periods.length === 0 ? (
          <p style={{ color: "#666", textAlign: "center", padding: 24 }}>
            لا توجد فترات مؤرشفة بعد.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={{ padding: 12, textAlign: "right", borderBottom: "2px solid #e5e7eb" }}>#</th>
                  <th style={{ padding: 12, textAlign: "right", borderBottom: "2px solid #e5e7eb" }}>العام الدراسي</th>
                  <th style={{ padding: 12, textAlign: "right", borderBottom: "2px solid #e5e7eb" }}>الفصل</th>
                  <th style={{ padding: 12, textAlign: "right", borderBottom: "2px solid #e5e7eb" }}>الشعب</th>
                  <th style={{ padding: 12, textAlign: "right", borderBottom: "2px solid #e5e7eb" }}>التسجيلات</th>
                  <th style={{ padding: 12, textAlign: "right", borderBottom: "2px solid #e5e7eb" }}>تاريخ الأرشفة</th>
                  <th style={{ padding: 12, textAlign: "right", borderBottom: "2px solid #e5e7eb" }}>الحالة</th>
                  <th style={{ padding: 12, textAlign: "right", borderBottom: "2px solid #e5e7eb" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {[...periods]
                  .sort((a, b) => {
                    if (b.academic_year !== a.academic_year) return b.academic_year - a.academic_year;
                    const semOrder = { first: 1, second: 2, summer: 3 };
                    return (semOrder[b.semester] || 0) - (semOrder[a.semester] || 0);
                  })
                  .map((p, i) => (
                  <tr key={`${p.academic_year}-${p.semester}-${p.archived_period || ''}-${i}`} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: 12, color: "#6b7280" }}>{i + 1}</td>
                    <td style={{ padding: 12, fontWeight: 600 }}>{p.academic_year}</td>
                    <td style={{ padding: 12 }}>{p.semester_label}</td>
                    <td style={{ padding: 12 }}>
                      <span style={{ background: "#dbeafe", color: "#1e40af", padding: "2px 10px", borderRadius: 999, fontSize: 13, fontWeight: 600 }}>
                        {p.sections_count}
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>
                      <span style={{ background: "#fef3c7", color: "#92400e", padding: "2px 10px", borderRadius: 999, fontSize: 13, fontWeight: 600 }}>
                        {p.enrollments_count}
                      </span>
                    </td>
                    <td style={{ padding: 12, fontSize: 13, color: "#666" }}>
                      {p.archived_at ? new Date(p.archived_at).toLocaleString("ar") : "-"}
                    </td>
                    <td style={{ padding: 12 }}>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        background: "#dcfce7",
                        color: "#166534",
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                      }}>
                        <CheckCircle2 size={14} /> مؤرشف
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>
                      <button
                        onClick={() => {
                          const params = new URLSearchParams({
                            academic_year: p.academic_year,
                            semester: p.semester,
                          });
                          if (p.archived_period) params.set("archived_period", p.archived_period);
                          navigate(`/head-department/archive/details?${params.toString()}`);
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: "#3b82f6",
                          color: "#fff",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        <Eye size={14} /> عرض التفاصيل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
